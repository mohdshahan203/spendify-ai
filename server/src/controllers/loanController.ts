import { Response } from 'express';
import axios from 'axios';
import { AuthenticatedRequest } from '../middleware/auth';
import { dbService } from '../services/dbService';
import {
  generateAmortisationSchedule,
  evaluateAffordabilityScenarios,
  calculateReducingBalanceEMI,
  compareLoanScenarios,
  simulatePrepayment
} from '../services/loanMathService';
import { geminiService } from '../services/geminiService';
import { SAMPLE_PROFILES_DATA } from '../config/db';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/loans/calculate
 * Pure deterministic reducing-balance loan calculator with amortisation schedule
 */
export const calculateLoan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      amount,
      annualRate = 13.5,
      tenureMonths = 12,
      processingFeePercent = 1.5,
      flatProcessingFee = 0,
      additionalCharges = 0
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid positive loan amount is required.' });
    }

    const result = generateAmortisationSchedule({
      amount: Number(amount),
      annualRate: Number(annualRate),
      tenureMonths: Number(tenureMonths),
      processingFeePercent: Number(processingFeePercent),
      flatProcessingFee: Number(flatProcessingFee),
      additionalCharges: Number(additionalCharges)
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Calculate loan error:', error);
    res.status(500).json({ error: 'Loan calculation failed: ' + error.message });
  }
};

/**
 * POST /api/loans/affordability-suggestions
 * Evaluates borrower cashflow surplus and offers multiple scenarios
 */
export const getAffordabilitySuggestions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      requestedAmount = 50000,
      requestedTenure = 12,
      baseRate = 13.5,
      customIncome,
      customExpenses,
      customExistingEmis,
      askAI = false
    } = req.body;

    // Load borrower profile for baseline figures
    const userRecord = await dbService.user.findUnique({ where: { id: userId } });
    const matched = SAMPLE_PROFILES_DATA.find(p => p.email === userRecord?.email);
    const userLoans = await dbService.loan.findMany({ where: { userId } });
    const activeLoans = userLoans.filter(l => l.status === 'APPROVED' || l.status === 'ACTIVE');
    const existingDebtFromDb = activeLoans.reduce((sum, l) => sum + (Number(l.emi) || 0), 0);

    const monthlyIncome = customIncome ? Number(customIncome) : (matched?.spendingHabits?.monthlyIncome || 55000);
    const essentialExpenses = customExpenses ? Number(customExpenses) : (matched?.spendingHabits?.monthlyExpenses || 28000);
    const existingDebtEmis = customExistingEmis !== undefined ? Number(customExistingEmis) : existingDebtFromDb;
    const savings = matched ? Math.round(monthlyIncome * 0.35) : 30000;

    const evaluation = evaluateAffordabilityScenarios(
      {
        monthlyIncome,
        essentialExpenses,
        existingDebtEmis,
        savings,
        monthlySurplus: monthlyIncome - essentialExpenses - existingDebtEmis,
        debtToIncomeRatio: 0
      },
      Number(requestedAmount),
      Number(baseRate),
      Number(requestedTenure)
    );

    let aiExplanation = null;
    if (askAI && geminiService.isConfigured()) {
      const prompt = `Based on deterministic calculations:
- Monthly Income: ₹${monthlyIncome.toLocaleString('en-IN')}
- Living Expenses: ₹${essentialExpenses.toLocaleString('en-IN')}
- Existing Debt EMIs: ₹${existingDebtEmis.toLocaleString('en-IN')}
- Available Monthly Surplus: ₹${evaluation.profile.monthlySurplus.toLocaleString('en-IN')}
- Proposed Loan: ₹${requestedAmount.toLocaleString('en-IN')} for ${requestedTenure} months at ${baseRate}% p.a.
- Proposed EMI: ₹${evaluation.requestedEmi.toLocaleString('en-IN')}
- Projected Surplus: ₹${evaluation.projectedSurplus.toLocaleString('en-IN')}
- Affordability Classification: ${evaluation.overallStatus}

Briefly explain why this loan scenario is classified as ${evaluation.overallStatus} in 2-3 clear, conversational sentences for the borrower.`;

      const aiRes = await geminiService.askAdvisor(prompt, {
        userName: userRecord?.name || 'Borrower',
        kycStatus: 'APPROVED',
        monthlyIncome,
        monthlyExpenses: essentialExpenses,
        existingDebtEmis,
        monthlySurplus: evaluation.profile.monthlySurplus
      });
      if (aiRes.success) {
        aiExplanation = aiRes.reply;
      }
    }

    res.status(200).json({
      ...evaluation,
      aiExplanation
    });
  } catch (error: any) {
    console.error('Affordability suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate affordability suggestions: ' + error.message });
  }
};

/**
 * POST /api/loans/apply
 * Applies for micro-loan, enforces KYC, triggers ML scoring, creates repayment schedule
 */
export const applyForLoan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1. Verify KYC approval
    const kyc = await dbService.kycDocument.findUnique({ where: { userId } });
    if (!kyc || kyc.status !== 'APPROVED') {
      return res.status(403).json({
        error: 'Loan applications are locked.',
        kycStatus: kyc ? kyc.status : 'NOT_STARTED',
        message: kyc?.status === 'PENDING'
          ? 'KYC is currently under review by our compliance team.'
          : 'KYC must be completed and approved before applying for loans.'
      });
    }

    const { amount, tenureMonths, interestRate = 13.5, features } = req.body;
    if (!amount || !tenureMonths) {
      return res.status(400).json({ error: 'Missing required loan fields (amount, tenureMonths).' });
    }

    // Calculate deterministic schedule & fee reconciliation
    const quote = generateAmortisationSchedule({
      amount: Number(amount),
      annualRate: Number(interestRate),
      tenureMonths: Number(tenureMonths)
    });

    // Create loan application in database
    const loan = await dbService.loan.create({
      data: {
        userId,
        amount: quote.principal,
        tenureMonths: quote.tenureMonths,
        interestRate: quote.annualRate,
        emi: quote.emi,
        processingFee: quote.processingFee,
        totalInterest: quote.totalInterest,
        totalPayable: quote.totalPayable,
        outstandingBalance: quote.principal,
        paidInstalments: 0,
        totalInstalments: quote.tenureMonths,
        nextDueDate: quote.schedule[0]?.dueDate,
        status: 'PENDING'
      }
    });

    // Populate loan repayment schedule
    const scheduleItems = quote.schedule.map(s => ({
      ...s,
      id: `${loan.id}-inst-${s.instalmentNumber}`,
      loanId: loan.id
    }));
    await dbService.repaymentSchedule.createMany({ data: scheduleItems });

    // 2. Call ML Service for behavioral risk assessment
    let aiResponse: any;
    try {
      const mlPayload = {
        userId,
        loanAmount: quote.principal,
        tenureMonths: quote.tenureMonths,
        interestRate: quote.annualRate,
        emi: quote.emi,
        features: features || {
          limit_bal: Number(amount) * 2,
          sex: 1,
          education: 2,
          marriage: 1,
          age: 30,
          pay_0: 0, pay_2: 0, pay_3: 0, pay_4: 0, pay_5: 0, pay_6: 0,
          bill_amt1: 10000, bill_amt2: 10000, bill_amt3: 10000, bill_amt4: 10000, bill_amt5: 10000, bill_amt6: 10000,
          pay_amt1: 1500, pay_amt2: 1500, pay_amt3: 1500, pay_amt4: 1500, pay_amt5: 1500, pay_amt6: 1500
        }
      };

      const mlRes = await axios.post(`${ML_SERVICE_URL}/api/ml/predict`, mlPayload, { timeout: 8000 });
      aiResponse = mlRes.data;
    } catch (mlErr: any) {
      console.warn('ML Service inference failed or offline. Evaluating using deterministic telemetry scoring.');
      const userTxs = await dbService.userTransaction.findMany({ where: { userId } });
      const incomeTxs = userTxs.filter(t => t.type === 'INCOME');
      const expenseTxs = userTxs.filter(t => t.type === 'EXPENSE');
      const inc = incomeTxs.reduce((s, t) => s + t.amount, 0) || 50000;
      const exp = expenseTxs.reduce((s, t) => s + t.amount, 0) || 25000;
      const surplus = inc - exp - quote.emi;
      const dtiRatio = (quote.emi / inc) * 100;
      const defaultProbability = Math.min(0.85, Math.max(0.05, (dtiRatio / 100) * 0.6 + (surplus < 0 ? 0.3 : 0)));
      const creditScore = Math.round(Math.max(300, Math.min(900, 900 - defaultProbability * 600)));
      const riskCategory = defaultProbability >= 0.4 ? 'HIGH' : defaultProbability >= 0.2 ? 'MEDIUM' : 'LOW';

      aiResponse = {
        creditScore,
        financialHealth: Math.round(100 - defaultProbability * 100),
        defaultProbability: Math.round(defaultProbability * 100) / 100,
        riskCategory,
        shapExplanation: {
          dti_exposure: Math.round(dtiRatio * 10) / 10,
          surplus_buffer: surplus > 0 ? -0.1 : 0.2
        },
        isRisky: riskCategory === 'HIGH',
        modelVersion: 'deterministic-cashflow-v2'
      };
    }

    // Persist prediction
    const prediction = await dbService.aiPrediction.create({
      data: {
        loanId: loan.id,
        creditScore: aiResponse.creditScore,
        financialHealth: aiResponse.financialHealth,
        defaultProbability: aiResponse.defaultProbability,
        riskCategory: aiResponse.riskCategory,
        shapExplanation: aiResponse.shapExplanation,
        recommendationNote: aiResponse.isRisky
          ? `Elevated risk tier (${aiResponse.riskCategory}). Restructuring suggested.`
          : 'Standard risk profile approved for underwriter review.'
      }
    });

    let recommendation = null;
    if (aiResponse.isRisky && aiResponse.recommendation) {
      recommendation = await dbService.loanRecommendation.create({
        data: {
          loanId: loan.id,
          suggestedAmount: aiResponse.recommendation.suggestedAmount,
          suggestedTenure: aiResponse.recommendation.suggestedTenure,
          suggestedEmi: aiResponse.recommendation.suggestedEmi,
          suggestedRate: aiResponse.recommendation.suggestedRate,
          rationale: aiResponse.recommendation.rationale
        }
      });
    }

    res.status(201).json({
      message: aiResponse.isRisky
        ? 'Loan application submitted. Restructuring recommendation offered due to credit risk tier.'
        : 'Loan application submitted successfully.',
      loan: {
        ...loan,
        prediction,
        recommendation,
        repayments: scheduleItems
      },
      quote
    });
  } catch (error: any) {
    console.error('Apply for loan error:', error);
    res.status(500).json({ error: 'Failed to process loan application: ' + error.message });
  }
};

/**
 * GET /api/loans/history
 * Retrieves borrower's loan history
 */
export const getLoanHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const loans = await dbService.loan.findMany({ where: { userId } });
    res.status(200).json(loans);
  } catch (error: any) {
    console.error('Loan history error:', error);
    res.status(500).json({ error: 'Failed to retrieve loan history.' });
  }
};

/**
 * GET /api/loans/repayments
 * Retrieves all approved/active loans with their repayment schedule & payment status
 */
export const getRepayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const allLoans = await dbService.loan.findMany({ where: { userId } });
    const approvedLoans = allLoans.filter(l => l.status === 'APPROVED' || l.status === 'ACTIVE' || l.status === 'PAID');

    const loansWithRepayments = await Promise.all(
      approvedLoans.map(async (l) => {
        let schedule = await dbService.repaymentSchedule.findMany({ where: { loanId: l.id } });
        
        // If schedule doesn't exist yet, generate it deterministically
        if (!schedule || schedule.length === 0) {
          const quote = generateAmortisationSchedule({
            amount: l.amount,
            annualRate: l.interestRate,
            tenureMonths: l.tenureMonths
          }, l.id);
          await dbService.repaymentSchedule.createMany({ data: quote.schedule });
          schedule = quote.schedule;
        }

        const paidInstalments = schedule.filter(s => s.status === 'PAID').length;
        const totalInstalments = schedule.length;
        const totalRepaid = schedule.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.emiAmount, 0);
        const nextDueInstalment = schedule.find(s => s.status !== 'PAID');

        return {
          ...l,
          paidInstalments,
          totalInstalments,
          totalRepaid: Math.round(totalRepaid * 100) / 100,
          nextDueDate: nextDueInstalment?.dueDate || null,
          nextDueAmount: nextDueInstalment?.emiAmount || 0,
          repayments: schedule
        };
      })
    );

    res.status(200).json(loansWithRepayments);
  } catch (error: any) {
    console.error('Get repayments error:', error);
    res.status(500).json({ error: 'Failed to retrieve repayment schedule.' });
  }
};

/**
 * POST /api/loans/pay-emi
 * Idempotent, simulated or authorized payment processing workflow
 */
export const payEMI = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { loanId, instalmentId, amount, paymentMethod = 'SIMULATED_UPI' } = req.body;

    if (!loanId || !amount) {
      return res.status(400).json({ error: 'Loan ID and payment amount are required.' });
    }

    const loan = await dbService.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      return res.status(404).json({ error: 'Loan record not found.' });
    }

    if (loan.userId !== userId && req.user?.role === 'BORROWER') {
      return res.status(403).json({ error: 'Forbidden: You cannot pay repayments for another borrower.' });
    }

    // Generate unique demo reference
    const referenceId = `SPDF-PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 1. Create transaction record
    const tx = await dbService.transaction.create({
      data: {
        loanId,
        amount: Number(amount),
        type: 'EMI_PAYMENT',
        status: 'SUCCESS',
        paymentMethod: `${paymentMethod} (Demo Mode)`,
        referenceId
      }
    });

    // 2. Mark specific repayment instalment as PAID
    let updatedInstalment = null;
    const schedule = await dbService.repaymentSchedule.findMany({ where: { loanId } });
    const target = instalmentId
      ? schedule.find(s => s.id === instalmentId)
      : schedule.find(s => s.status !== 'PAID');

    if (target) {
      updatedInstalment = await dbService.repaymentSchedule.update({
        where: { id: target.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          transactionId: tx.id,
          paymentMethod
        }
      });
    }

    // 3. Reconcile remaining balance
    const updatedSchedule = await dbService.repaymentSchedule.findMany({ where: { loanId } });
    const allPaid = updatedSchedule.length > 0 && updatedSchedule.every(s => s.status === 'PAID');
    const remainingBalance = Math.max(0, (loan.outstandingBalance || loan.amount) - Number(amount));
    const paidCount = updatedSchedule.filter(s => s.status === 'PAID').length;

    const newLoanStatus = allPaid || remainingBalance <= 0 ? 'PAID' : 'ACTIVE';
    const updatedLoan = await dbService.loan.update({
      where: { id: loanId },
      data: {
        status: newLoanStatus,
        outstandingBalance: remainingBalance,
        paidInstalments: paidCount
      }
    });

    // 4. Build formal payment receipt
    const receipt = {
      receiptNumber: `REC-${referenceId}`,
      transactionId: tx.id,
      referenceId,
      loanId,
      borrowerName: (req.user as any)?.name || req.user?.email,
      amountPaid: Number(amount),
      paymentMethod: `${paymentMethod} (Simulated Demo)`,
      timestamp: new Date().toISOString(),
      instalmentNumber: target?.instalmentNumber || paidCount,
      remainingBalance,
      loanStatus: newLoanStatus,
      disclaimer: 'This receipt was generated by SpendiFy Simulated Payment Gateway for academic demonstration.'
    };

    res.status(200).json({
      message: 'Payment recorded and reconciled successfully.',
      receipt,
      transaction: tx,
      instalment: updatedInstalment,
      loan: updatedLoan
    });
  } catch (error: any) {
    console.error('EMI Payment error:', error);
    res.status(500).json({ error: 'Failed to process repayment: ' + error.message });
  }
};

/**
 * POST /api/loans/compare
 * Side-by-side comparison of 2 loan proposals
 */
export const compareScenarios = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planA, planB } = req.body;
    if (!planA || !planB) {
      return res.status(400).json({ error: 'planA and planB objects are required.' });
    }

    const comparison = compareLoanScenarios(planA, planB);
    res.status(200).json(comparison);
  } catch (error: any) {
    console.error('compareScenarios error:', error);
    res.status(500).json({ error: 'Failed to compare loan scenarios.' });
  }
};

/**
 * POST /api/loans/simulate-prepayment
 * Calculates tenure reduction & total interest saved with prepayment
 */
export const simulateLoanPrepayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, annualRate, tenureMonths, extraMonthlyPayment, oneTimePrepayment, prepaymentMonth } = req.body;
    if (!amount || !annualRate || !tenureMonths) {
      return res.status(400).json({ error: 'amount, annualRate, and tenureMonths are required.' });
    }

    const result = simulatePrepayment({
      amount: Number(amount),
      annualRate: Number(annualRate),
      tenureMonths: Number(tenureMonths),
      extraMonthlyPayment: Number(extraMonthlyPayment) || 0,
      oneTimePrepayment: Number(oneTimePrepayment) || 0,
      prepaymentMonth: Number(prepaymentMonth) || 1
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('simulateLoanPrepayment error:', error);
    res.status(500).json({ error: 'Failed to simulate prepayment.' });
  }
};

/**
 * Saved Loan Scenarios
 */
export const getSavedScenarios = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const scenarios = await dbService.savedScenario.findMany({ where: { userId } });
    res.status(200).json(scenarios);
  } catch (error: any) {
    console.error('getSavedScenarios error:', error);
    res.status(500).json({ error: 'Failed to retrieve saved scenarios.' });
  }
};

export const saveScenario = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const { name, amount, annualRate, tenureMonths, emi, totalInterest, totalPayable } = req.body;
    if (!name || !amount) {
      return res.status(400).json({ error: 'Name and amount are required.' });
    }

    const saved = await dbService.savedScenario.create({
      data: {
        userId,
        name: name.trim(),
        amount: Number(amount),
        annualRate: Number(annualRate),
        tenureMonths: Number(tenureMonths),
        emi: Number(emi),
        totalInterest: Number(totalInterest),
        totalPayable: Number(totalPayable)
      }
    });

    res.status(201).json({ message: 'Scenario saved successfully.', scenario: saved });
  } catch (error: any) {
    console.error('saveScenario error:', error);
    res.status(500).json({ error: 'Failed to save loan scenario.' });
  }
};

export const deleteSavedScenario = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    await dbService.savedScenario.delete({ where: { id } });
    res.status(200).json({ message: 'Saved scenario deleted.' });
  } catch (error: any) {
    console.error('deleteSavedScenario error:', error);
    res.status(500).json({ error: 'Failed to delete scenario.' });
  }
};

/**
 * Loan Application Drafts
 */
export const getLoanDraft = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const draft = await dbService.loanDraft.findUnique({ where: { userId } });
    res.status(200).json(draft || null);
  } catch (error: any) {
    console.error('getLoanDraft error:', error);
    res.status(500).json({ error: 'Failed to retrieve loan draft.' });
  }
};

export const saveLoanDraft = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const { amount, tenureMonths, purpose, monthlyIncome, employmentType, notes } = req.body;

    const draft = await dbService.loanDraft.upsert({
      where: { userId },
      update: {
        amount: Number(amount) || 0,
        tenureMonths: Number(tenureMonths) || 12,
        purpose: purpose || '',
        monthlyIncome: Number(monthlyIncome) || 0,
        employmentType: employmentType || '',
        notes: notes || ''
      },
      create: {
        amount: Number(amount) || 0,
        tenureMonths: Number(tenureMonths) || 12,
        purpose: purpose || '',
        monthlyIncome: Number(monthlyIncome) || 0,
        employmentType: employmentType || '',
        notes: notes || ''
      }
    });

    res.status(200).json({ message: 'Draft saved successfully.', draft });
  } catch (error: any) {
    console.error('saveLoanDraft error:', error);
    res.status(500).json({ error: 'Failed to save draft.' });
  }
};

export const deleteLoanDraft = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    await dbService.loanDraft.delete({ where: { userId } });
    res.status(200).json({ message: 'Draft discarded.' });
  } catch (error: any) {
    console.error('deleteLoanDraft error:', error);
    res.status(500).json({ error: 'Failed to discard draft.' });
  }
};

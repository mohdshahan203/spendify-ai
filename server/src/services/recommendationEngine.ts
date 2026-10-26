import { dbService } from './dbService';
import { calculateReducingBalanceEMI } from './loanMathService';
import { calculateCreditScoreForUser } from './creditScoreService';

export interface DataDrivenRecommendation {
  id: string;
  category: 'AFFORDABILITY' | 'REPAYMENT' | 'CASH_FLOW' | 'CREDIT_BUILDING' | 'DATA_QUALITY';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  condition: string;
  supportingData: Record<string, any>;
  suggestedAction: string;
  reason: string;
  tradeOff?: string;
  isActionable: boolean;
}

export interface RecommendationEngineResult {
  userId: string;
  generatedAt: string;
  financialMetrics: {
    monthlyIncome: number;
    monthlyExpenses: number;
    disposableIncome: number;
    existingDebtEmis: number;
    debtToIncomeRatio: number;
    savingsBuffer: number;
    creditScore: number;
    riskCategory: string;
    incomeStability: 'STABLE' | 'MODERATE' | 'VOLATILE';
    overdueRepaymentsCount: number;
    onTimeRepaymentsCount: number;
    transactionCount: number;
    dataSufficiency: 'SUFFICIENT' | 'PRELIMINARY' | 'INSUFFICIENT';
  };
  recommendations: DataDrivenRecommendation[];
}

/**
 * Evaluates real borrower financial telemetry and produces comprehensive data-driven recommendations
 */
export async function generateBorrowerRecommendations(
  userId: string,
  loanProposal?: { amount: number; tenureMonths: number; interestRate?: number; purpose?: string }
): Promise<RecommendationEngineResult> {
  const user = await dbService.user.findUnique({ where: { id: userId } });
  const kyc = await dbService.kycDocument.findUnique({ where: { userId } });
  const userLoans = await dbService.loan.findMany({ where: { userId } });
  const userTxs = await dbService.userTransaction.findMany({ where: { userId } });

  // Gather all repayments
  let allRepayments: any[] = [];
  for (const l of userLoans) {
    const reps = await dbService.repaymentSchedule.findMany({ where: { loanId: l.id } });
    allRepayments = allRepayments.concat(reps);
  }

  // Active loan obligations
  const activeLoans = userLoans.filter(l => l.status === 'ACTIVE' || l.status === 'APPROVED');
  const existingDebtEmis = activeLoans.reduce((sum, l) => sum + (Number(l.emi) || 0), 0);

  // Derive income & expenses from transactions
  const incomeTxs = userTxs.filter(t => t.type === 'INCOME');
  const expenseTxs = userTxs.filter(t => t.type === 'EXPENSE');

  // Month-by-month grouping for income stability calculation
  const monthlyIncomes: Record<string, number> = {};
  for (const tx of incomeTxs) {
    const month = tx.date.slice(0, 7);
    monthlyIncomes[month] = (monthlyIncomes[month] || 0) + tx.amount;
  }

  const incomeValues = Object.values(monthlyIncomes);
  let monthlyIncome = 0;
  if (incomeValues.length > 0) {
    monthlyIncome = Math.round(incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length);
  }

  // Calculate Income Stability (standard deviation / mean)
  let incomeStability: 'STABLE' | 'MODERATE' | 'VOLATILE' = 'STABLE';
  if (incomeValues.length >= 2) {
    const mean = monthlyIncome;
    const variance = incomeValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / incomeValues.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / (mean || 1);
    if (cv > 0.35) incomeStability = 'VOLATILE';
    else if (cv > 0.15) incomeStability = 'MODERATE';
    else incomeStability = 'STABLE';
  } else if (incomeTxs.length === 0) {
    incomeStability = 'MODERATE';
  }

  // Expenses calculation
  const monthlyExpensesMap: Record<string, number> = {};
  for (const tx of expenseTxs) {
    const month = tx.date.slice(0, 7);
    monthlyExpensesMap[month] = (monthlyExpensesMap[month] || 0) + tx.amount;
  }
  const expenseValues = Object.values(monthlyExpensesMap);
  let monthlyExpenses = 0;
  if (expenseValues.length > 0) {
    monthlyExpenses = Math.round(expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length);
  }

  // Categorize discretionary spending (dining, entertainment, shopping)
  const discretionaryKeywords = ['dining', 'restaurant', 'food delivery', 'entertainment', 'movie', 'shopping', 'leisure', 'subscription', 'electronics'];
  const discretionaryTxs = expenseTxs.filter(t => 
    discretionaryKeywords.some(kw => t.category.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw))
  );
  const discretionaryTotal = discretionaryTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenseSum = expenseTxs.reduce((sum, t) => sum + t.amount, 0) || 1;
  const discretionaryPercent = Math.round((discretionaryTotal / totalExpenseSum) * 100);

  // Disposable income & DTI
  const disposableIncome = Math.round(monthlyIncome - monthlyExpenses - existingDebtEmis);
  const debtToIncomeRatio = monthlyIncome > 0
    ? Math.round((existingDebtEmis / monthlyIncome) * 1000) / 10
    : 0;

  // Savings / buffer estimation
  const savingsBuffer = Math.max(0, Math.round(monthlyIncome * 0.4));

  // Repayment compliance stats
  const onTimeRepaymentsCount = allRepayments.filter(r => r.status === 'PAID').length;
  const overdueRepaymentsCount = allRepayments.filter(r => r.status === 'OVERDUE').length;

  // Credit Score & Risk assessment
  let creditScore = 740;
  let riskCategory = 'LOW';
  let defaultProb = 0.12;

  try {
    const assessment = await calculateCreditScoreForUser(userId);
    creditScore = assessment.creditScore;
    riskCategory = assessment.riskCategory;
    defaultProb = assessment.defaultProbability;
  } catch {
    // Graceful fallback to user prediction
    const latestLoan = userLoans[userLoans.length - 1];
    if (latestLoan?.prediction) {
      creditScore = latestLoan.prediction.creditScore;
      riskCategory = latestLoan.prediction.riskCategory;
      defaultProb = latestLoan.prediction.defaultProbability;
    }
  }

  // Determine data sufficiency
  const dataSufficiency: 'SUFFICIENT' | 'PRELIMINARY' | 'INSUFFICIENT' = 
    userTxs.length >= 10 ? 'SUFFICIENT' : userTxs.length >= 2 ? 'PRELIMINARY' : 'INSUFFICIENT';

  // Loan proposal parameters (if requested)
  const propAmount = loanProposal?.amount || 50000;
  const propTenure = loanProposal?.tenureMonths || 12;
  const propRate = loanProposal?.interestRate || 13.5;
  const propEmi = calculateReducingBalanceEMI(propAmount, propRate, propTenure);

  const recommendations: DataDrivenRecommendation[] = [];

  // ─── RULE 1: DATA SUFFICIENCY RECOMMENDATION ───
  if (dataSufficiency === 'INSUFFICIENT') {
    recommendations.push({
      id: 'rec-data-sufficiency',
      category: 'DATA_QUALITY',
      priority: 'HIGH',
      condition: 'Insufficient Verified Transaction Telemetry',
      supportingData: {
        recordedTransactions: userTxs.length,
        kycStatus: kyc?.status || 'NOT_STARTED',
        recommendedMinimumTransactions: 5
      },
      suggestedAction: 'Link your bank account, record recurring transactions, or import a bank statement CSV.',
      reason: 'Automated micro-lending risk models require at least 5 verified transaction data points to offer maximum loan amounts and preferential interest rates.',
      isActionable: true
    });
  }

  // ─── RULE 2: OVERDUE REPAYMENTS (CRITICAL DEBT CONSISTENCY) ───
  if (overdueRepaymentsCount > 0) {
    const overdueInstalments = allRepayments.filter(r => r.status === 'OVERDUE');
    const overdueTotal = overdueInstalments.reduce((sum, r) => sum + (Number(r.emiAmount) || 0), 0);

    recommendations.push({
      id: 'rec-overdue-repayments',
      category: 'REPAYMENT',
      priority: 'HIGH',
      condition: `Active Overdue Instalments Detected (${overdueRepaymentsCount} missed)`,
      supportingData: {
        overdueCount: overdueRepaymentsCount,
        overdueAmount: overdueTotal,
        totalDueScheduled: allRepayments.length
      },
      suggestedAction: `Settle outstanding overdue payments (₹${overdueTotal.toLocaleString('en-IN')}) immediately before taking on additional debt.`,
      reason: 'Delinquent instalments trigger late fees, inflate default probability predictions, and adversely affect eligibility across all credit facilities.',
      isActionable: true
    });
  }

  // ─── RULE 3: DISPOSABLE INCOME VS PROPOSED EMI ───
  if (disposableIncome < propEmi) {
    const deficit = Math.round(propEmi - disposableIncome);
    const longerTenure = Math.min(36, propTenure + 12);
    const restructuredEmi = calculateReducingBalanceEMI(propAmount, propRate, longerTenure);
    const safePrincipal = Math.max(10000, Math.round((Math.max(1000, disposableIncome * 0.5) * propTenure * 0.85) / 1000) * 1000);
    const safeEmi = calculateReducingBalanceEMI(safePrincipal, propRate, propTenure);

    recommendations.push({
      id: 'rec-disposable-deficit',
      category: 'AFFORDABILITY',
      priority: 'HIGH',
      condition: 'Proposed Monthly EMI Exceeds Available Disposable Surplus',
      supportingData: {
        monthlyIncome,
        livingExpenses: monthlyExpenses,
        existingDebtEmis,
        disposableIncome,
        proposedEmi: propEmi,
        monthlyDeficit: deficit
      },
      suggestedAction: `Select an extended tenure of ${longerTenure} months (EMI ₹${restructuredEmi.toLocaleString('en-IN')}) or downsize the loan principal to ₹${safePrincipal.toLocaleString('en-IN')} (EMI ₹${safeEmi.toLocaleString('en-IN')}).`,
      reason: `Your verified monthly surplus (₹${disposableIncome.toLocaleString('en-IN')}) leaves a shortfall of ₹${deficit.toLocaleString('en-IN')} against the proposed ₹${propEmi.toLocaleString('en-IN')} EMI, creating high default vulnerability.`,
      tradeOff: `Extending tenure to ${longerTenure} months lowers monthly EMI by ₹${Math.round(propEmi - restructuredEmi).toLocaleString('en-IN')}, though total cumulative interest increases by ₹${Math.round((restructuredEmi * longerTenure) - (propEmi * propTenure)).toLocaleString('en-IN')}.`,
      isActionable: true
    });
  } else if (disposableIncome >= propEmi && disposableIncome < propEmi * 1.5) {
    // Tight liquidity margin
    recommendations.push({
      id: 'rec-tight-liquidity',
      category: 'AFFORDABILITY',
      priority: 'MEDIUM',
      condition: 'Tight Cashflow Margin After Proposed Debt Service',
      supportingData: {
        disposableIncome,
        proposedEmi: propEmi,
        remainingSurplusAfterEmi: disposableIncome - propEmi,
        surplusConsumptionPercent: Math.round((propEmi / Math.max(1, disposableIncome)) * 100)
      },
      suggestedAction: 'Establish an emergency reserve fund covering at least 2 months of EMIs before drawing the full credit line.',
      reason: `The proposed loan will consume ${Math.round((propEmi / disposableIncome) * 100)}% of your free cashflow, leaving only ₹${(disposableIncome - propEmi).toLocaleString('en-IN')} for unexpected household expenses.`,
      isActionable: true
    });
  }

  // ─── RULE 4: DEBT-TO-INCOME (DTI) EXPOSURE ───
  const projectedTotalDebt = existingDebtEmis + propEmi;
  const projectedDti = monthlyIncome > 0 ? Math.round((projectedTotalDebt / monthlyIncome) * 1000) / 10 : 0;

  if (projectedDti > 45) {
    recommendations.push({
      id: 'rec-high-dti',
      category: 'AFFORDABILITY',
      priority: 'HIGH',
      condition: `Projected Debt-to-Income (${projectedDti}%) Exceeds Recommended Limit`,
      supportingData: {
        existingDti: `${debtToIncomeRatio}%`,
        projectedDti: `${projectedDti}%`,
        monthlyIncome,
        totalMonthlyDebtCommitment: projectedTotalDebt,
        industryBenchmark: 'Under 40%'
      },
      suggestedAction: 'Consider consolidating existing obligations or reducing the requested principal to bring DTI under 35%.',
      reason: 'Underwriters and credit bureaus treat debt-to-income ratios above 40% as a primary indicator of debt overextension.',
      isActionable: true
    });
  }

  // ─── RULE 5: STABLE INCOME & EXCELLENT REPAYMENT (PRIME BORROWER ADVANTAGE) ───
  if (incomeStability === 'STABLE' && overdueRepaymentsCount === 0 && disposableIncome >= propEmi * 2.2 && debtToIncomeRatio < 30) {
    const shorterTenure = Math.max(6, propTenure - 6);
    const shortCalcEmi = calculateReducingBalanceEMI(propAmount, propRate, shorterTenure);
    const interestSaved = Math.round((propEmi * propTenure) - (shortCalcEmi * shorterTenure));

    recommendations.push({
      id: 'rec-prime-saver',
      category: 'CREDIT_BUILDING',
      priority: 'MEDIUM',
      condition: 'Prime Financial Profile & Robust Cashflow Buffer',
      supportingData: {
        incomeStability,
        onTimeRepaymentRate: '100%',
        surplusToEmiRatio: `${(disposableIncome / (propEmi || 1)).toFixed(1)}x`,
        projectedSavings: Math.max(0, interestSaved)
      },
      suggestedAction: `Consider a shorter tenure of ${shorterTenure} months to save approximately ₹${Math.max(0, interestSaved).toLocaleString('en-IN')} in total borrowing cost.`,
      reason: 'Your stable income stream and flawless repayment track record comfortably absorb a slightly higher monthly payment, eliminating debt faster.',
      tradeOff: `Monthly EMI increases by ₹${Math.round(shortCalcEmi - propEmi).toLocaleString('en-IN')}, but you become completely debt-free 6 months earlier.`,
      isActionable: true
    });
  }

  // ─── RULE 6: DISCRETIONARY SPENDING OPTIMIZATION ───
  if (discretionaryPercent > 35) {
    const potentialMonthlySavings = Math.round(discretionaryTotal * 0.25);
    recommendations.push({
      id: 'rec-discretionary-spend',
      category: 'CASH_FLOW',
      priority: 'LOW',
      condition: `High Discretionary Spending Share (${discretionaryPercent}% of Monthly Expenses)`,
      supportingData: {
        totalMonthlyExpenses: monthlyExpenses,
        discretionarySpending: discretionaryTotal,
        discretionaryPercentage: `${discretionaryPercent}%`,
        potentialSavings: potentialMonthlySavings
      },
      suggestedAction: `Trim non-essential dining and entertainment expenses by 25% to free up ₹${potentialMonthlySavings.toLocaleString('en-IN')}/month in disposable surplus.`,
      reason: 'Optimizing discretionary outflow directly strengthens your liquid emergency buffer and speeds up voluntary debt repayment.',
      isActionable: true
    });
  }

  // ─── RULE 7: INCOME VOLATILITY BUFFER ───
  if (incomeStability === 'VOLATILE') {
    recommendations.push({
      id: 'rec-volatile-income',
      category: 'CASH_FLOW',
      priority: 'MEDIUM',
      condition: 'Variable Monthly Income Flow Detected',
      supportingData: {
        incomeStability: 'VOLATILE',
        incomeVarianceObserved: 'Significant variation between peak and low billing cycles',
        monthlyAverage: monthlyIncome
      },
      suggestedAction: 'Opt for flexible micro-loans with low fixed EMIs and prepayment flexibility without penalty charges.',
      reason: 'Variable income earners face heightened cashflow stress during dip months; keeping fixed EMI obligations low safeguards against accidental missed instalments.',
      isActionable: true
    });
  }

  // If no negative recommendations triggered, provide positive credit building guidance
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec-steady-course',
      category: 'CREDIT_BUILDING',
      priority: 'LOW',
      condition: 'Balanced Financial Health & Compliant Standings',
      supportingData: {
        creditScore,
        riskCategory,
        dti: `${debtToIncomeRatio}%`,
        surplus: `₹${disposableIncome.toLocaleString('en-IN')}`
      },
      suggestedAction: 'Maintain current budget pacing and schedule automatic EMI debits to preserve your score.',
      reason: 'All financial health indicators are within optimal operating bands.',
      isActionable: false
    });
  }

  return {
    userId,
    generatedAt: new Date().toISOString(),
    financialMetrics: {
      monthlyIncome,
      monthlyExpenses,
      disposableIncome,
      existingDebtEmis,
      debtToIncomeRatio,
      savingsBuffer,
      creditScore,
      riskCategory,
      incomeStability,
      overdueRepaymentsCount,
      onTimeRepaymentsCount,
      transactionCount: userTxs.length,
      dataSufficiency
    },
    recommendations
  };
}

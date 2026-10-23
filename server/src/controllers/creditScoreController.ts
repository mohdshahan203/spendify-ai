import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateCreditScoreForUser } from '../services/creditScoreService';
import { generateBorrowerRecommendations } from '../services/recommendationEngine';
import { dbService } from '../services/dbService';

/**
 * GET /api/credit-score
 * Returns the borrower's actual calculated credit score and transparent factor breakdown
 */
export const getCreditScore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const assessment = await calculateCreditScoreForUser(userId);
    res.status(200).json(assessment);
  } catch (error: any) {
    console.error('getCreditScore error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve credit score assessment: ' + error.message });
  }
};

/**
 * POST /api/credit-score/recalculate
 * Triggers backend scoring pipeline with latest borrower data and persists assessment
 */
export const recalculateCreditScore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const assessment = await calculateCreditScoreForUser(userId);

    // If user has an active or pending loan, update its AIPrediction record
    const userLoans = await dbService.loan.findMany({ where: { userId } });
    const latestLoan = userLoans.length > 0 ? userLoans[userLoans.length - 1] : null;

    if (latestLoan) {
      const existingPred = await dbService.aiPrediction.findUnique({ where: { loanId: latestLoan.id } });
      if (existingPred) {
        await dbService.aiPrediction.update({
          where: { loanId: latestLoan.id },
          data: {
            creditScore: assessment.creditScore,
            financialHealth: assessment.financialHealth,
            defaultProbability: assessment.defaultProbability,
            riskCategory: assessment.riskCategory,
            shapExplanation: assessment.shapExplanation,
            recommendationNote: assessment.explanation
          }
        });
      }
    }

    res.status(200).json({
      message: 'Credit score recalculated successfully using live ML scoring pipeline.',
      assessment
    });
  } catch (error: any) {
    console.error('recalculateCreditScore error:', error.message);
    res.status(500).json({ error: 'Failed to recalculate credit score: ' + error.message });
  }
};

/**
 * GET /api/loans/recommendations
 * Generates genuine, data-driven recommendations from live borrower telemetry
 */
export const getRecommendations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { amount, tenure, rate } = req.query;
    const loanProposal = amount && tenure ? {
      amount: Number(amount),
      tenureMonths: Number(tenure),
      interestRate: rate ? Number(rate) : 13.5
    } : undefined;

    const result = await generateBorrowerRecommendations(userId, loanProposal);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('getRecommendations error:', error.message);
    res.status(500).json({ error: 'Failed to generate recommendations: ' + error.message });
  }
};

/**
 * GET /api/financial-insights
 * Comprehensive live financial insights for the executive dashboard
 */
export const getFinancialInsights = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const [recResult, assessment, userLoans, alerts] = await Promise.all([
      generateBorrowerRecommendations(userId),
      calculateCreditScoreForUser(userId).catch(() => null),
      dbService.loan.findMany({ where: { userId } }),
      dbService.alert.findMany({ where: { userId, resolved: false } })
    ]);

    // Active loan repayments
    let upcomingRepayments: any[] = [];
    let overdueRepayments: any[] = [];
    for (const l of userLoans) {
      const schedule = await dbService.repaymentSchedule.findMany({ where: { loanId: l.id } });
      for (const inst of schedule) {
        if (inst.status === 'OVERDUE') overdueRepayments.push(inst);
        else if (inst.status === 'UPCOMING' || inst.status === 'DUE_SOON') upcomingRepayments.push(inst);
      }
    }

    // Sort upcoming repayments by dueDate ascending
    upcomingRepayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    res.status(200).json({
      metrics: recResult.financialMetrics,
      creditAssessment: assessment,
      recommendations: recResult.recommendations,
      activeAlertsCount: alerts.length,
      upcomingRepayments: upcomingRepayments.slice(0, 3),
      overdueRepayments: overdueRepayments,
      hasActiveLoans: userLoans.some(l => l.status === 'ACTIVE' || l.status === 'APPROVED'),
      activeLoansCount: userLoans.filter(l => l.status === 'ACTIVE' || l.status === 'APPROVED').length
    });
  } catch (error: any) {
    console.error('getFinancialInsights error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve financial insights: ' + error.message });
  }
};

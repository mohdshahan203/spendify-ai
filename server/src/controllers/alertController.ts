import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { dbService } from '../services/dbService';
import { evaluateFinancialWarnings } from '../services/loanMathService';
import { SAMPLE_PROFILES_DATA } from '../config/db';

export const getAlerts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch user context
    const userRecord = await dbService.user.findUnique({ where: { id: userId } });
    const kycDoc = await dbService.kycDocument.findUnique({ where: { userId } });
    const userLoans = await dbService.loan.findMany({ where: { userId } });
    const activeLoans = userLoans.filter(l => l.status === 'APPROVED' || l.status === 'ACTIVE');
    const repayments = await dbService.repaymentSchedule.findMany({ where: { loan: { userId } } });

    const matchedProfile = SAMPLE_PROFILES_DATA.find(p => p.email === userRecord?.email);
    const monthlyIncome = matchedProfile?.spendingHabits?.monthlyIncome || 50000;
    const essentialExpenses = matchedProfile?.spendingHabits?.monthlyExpenses || 26000;
    const existingDebtEmis = activeLoans.reduce((sum, l) => sum + (Number(l.emi) || 0), 0);
    const monthlySurplus = monthlyIncome - essentialExpenses - existingDebtEmis;

    // Evaluate dynamic rules
    const dynamicWarnings = evaluateFinancialWarnings(
      userId,
      {
        monthlyIncome,
        essentialExpenses,
        existingDebtEmis,
        savings: Math.round(monthlyIncome * 0.35),
        monthlySurplus,
        debtToIncomeRatio: monthlyIncome > 0 ? (existingDebtEmis / monthlyIncome) * 100 : 0
      },
      activeLoans,
      kycDoc?.status || 'NOT_STARTED',
      repayments
    );

    // Merge with persisted alerts
    const persistedAlerts = await dbService.alert.findMany({
      where: { userId }
    });

    // Create set of triggers to avoid duplicate display
    const existingTriggers = new Set(persistedAlerts.map(a => a.triggerType));
    const mergedAlerts = [...persistedAlerts];

    for (const dw of dynamicWarnings) {
      if (!existingTriggers.has(dw.triggerType)) {
        mergedAlerts.push(dw);
      }
    }

    res.status(200).json(mergedAlerts);
  } catch (error: any) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch financial warnings.' });
  }
};

export const resolveAlert = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { alertId } = req.body;
    if (!alertId) {
      return res.status(400).json({ error: 'Alert ID is required.' });
    }

    try {
      const updatedAlert = await dbService.alert.update({
        where: { id: alertId },
        data: { resolved: true }
      });
      return res.status(200).json({
        message: 'Alert marked as resolved.',
        alert: updatedAlert
      });
    } catch {
      // Dynamic alert dismissed
      return res.status(200).json({
        message: 'Alert marked as resolved.',
        alertId,
        resolved: true
      });
    }
  } catch (error: any) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert.' });
  }
};

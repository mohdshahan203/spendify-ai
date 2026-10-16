import { Request, Response } from 'express';
import { dbService } from '../services/dbService';

export const getMonthlySummaryReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const user = await dbService.user.findUnique({ where: { id: userId } });
    const kycDoc = await dbService.kycDocument.findUnique({ where: { userId } });
    const loans = await dbService.loan.findMany({ where: { userId } });
    const repayments = await dbService.repaymentSchedule.findMany({ where: { loan: { userId } } });
    const transactions = await dbService.userTransaction.findMany({ where: { userId } });
    const budgets = await dbService.budget.findMany({ where: { userId } });
    const goals = await dbService.savingsGoal.findMany({ where: { userId, isArchived: false } });

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTxs = transactions.filter(t => t.date.slice(0, 7) === currentMonth);
    const totalIncome = monthTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = monthTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const netCashflow = totalIncome - totalExpenses;

    const activeLoan = loans.find(l => l.status === 'APPROVED' || l.status === 'ACTIVE');
    const totalRepaid = repayments.filter(r => r.status === 'PAID').reduce((s, r) => s + r.emiAmount, 0);

    const report = {
      reportId: `REP-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      reportMonth: currentMonth,
      borrower: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        kycStatus: kycDoc?.status || 'NOT_STARTED'
      },
      cashflowSummary: {
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        netCashflow: Math.round(netCashflow),
        savingsRate: totalIncome > 0 ? `${Math.max(0, Math.round((netCashflow / totalIncome) * 100))}%` : '0%'
      },
      lendingSummary: {
        totalLoans: loans.length,
        activeLoanPrincipal: activeLoan ? activeLoan.amount : 0,
        outstandingBalance: activeLoan ? (activeLoan.outstandingBalance || activeLoan.amount) : 0,
        totalRepaid: Math.round(totalRepaid),
        activeLoanStatus: activeLoan ? activeLoan.status : 'NONE'
      },
      budgetsOverview: budgets.map(b => ({
        category: b.category,
        limit: b.limitAmount
      })),
      savingsProgress: goals.map(g => ({
        title: g.title,
        target: g.targetAmount,
        current: g.currentAmount,
        percent: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0
      }))
    };

    res.status(200).json(report);
  } catch (error: any) {
    console.error('getMonthlySummaryReport error:', error);
    res.status(500).json({ error: 'Failed to generate financial report.' });
  }
};

export const downloadReportCsv = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { type = 'transactions' } = req.query;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    if (type === 'repayments') {
      const schedule = await dbService.repaymentSchedule.findMany({ where: { loan: { userId } } });
      const headers = ['Instalment', 'Due Date', 'EMI (INR)', 'Principal', 'Interest', 'Opening Balance', 'Closing Balance', 'Status'];
      const rows = schedule.map(s => [
        s.instalmentNumber,
        s.dueDate ? s.dueDate.slice(0, 10) : '',
        s.emiAmount,
        s.principalComponent,
        s.interestComponent,
        s.openingBalance,
        s.closingBalance,
        s.status
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="spendify_repayments_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    } else {
      // Transactions CSV
      const transactions = await dbService.userTransaction.findMany({ where: { userId } });
      const headers = ['Date', 'Type', 'Category', 'Description', 'Payment Method', 'Amount (INR)', 'Verified'];
      const rows = transactions.map(t => [
        t.date ? t.date.slice(0, 10) : '',
        t.type,
        `"${t.category.replace(/"/g, '""')}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        t.paymentMethod || 'UPI',
        t.amount.toFixed(2),
        t.isVerified ? 'YES' : 'NO'
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="spendify_transactions_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }
  } catch (error: any) {
    console.error('downloadReportCsv error:', error);
    res.status(500).json({ error: 'Failed to download CSV report.' });
  }
};

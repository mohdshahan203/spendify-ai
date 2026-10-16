import { Request, Response } from 'express';
import { dbService } from '../services/dbService';

export const getBudgets = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const { month } = req.query;
    const currentMonth = (typeof month === 'string' && month) ? month : new Date().toISOString().slice(0, 7);

    const budgets = await dbService.budget.findMany({ where: { userId, month: currentMonth } });
    const allTxs = await dbService.userTransaction.findMany({ where: { userId, type: 'EXPENSE' } });
    const monthTxs = allTxs.filter(t => t.date.slice(0, 7) === currentMonth);

    // Compute spent amount for each budget category
    const enrichedBudgets = budgets.map(b => {
      const categorySpent = monthTxs
        .filter(t => t.category.toLowerCase() === b.category.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = Math.max(0, b.limitAmount - categorySpent);
      const percentUtilised = b.limitAmount > 0 ? Math.round((categorySpent / b.limitAmount) * 100) : 0;

      let status: 'HEALTHY' | 'WARNING_80' | 'EXCEEDED' = 'HEALTHY';
      if (percentUtilised >= 100) {
        status = 'EXCEEDED';
      } else if (percentUtilised >= 80) {
        status = 'WARNING_80';
      }

      return {
        ...b,
        spentAmount: Math.round(categorySpent),
        remainingAmount: Math.round(remaining),
        percentUtilised,
        status
      };
    });

    const totalBudget = enrichedBudgets.reduce((s, b) => s + b.limitAmount, 0);
    const totalSpent = enrichedBudgets.reduce((s, b) => s + b.spentAmount, 0);

    res.status(200).json({
      month: currentMonth,
      totalBudget,
      totalSpent,
      totalRemaining: Math.max(0, totalBudget - totalSpent),
      overallUtilisation: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      budgets: enrichedBudgets
    });
  } catch (error: any) {
    console.error('getBudgets error:', error);
    res.status(500).json({ error: 'Failed to retrieve budgets.' });
  }
};

export const upsertBudget = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const { category, limitAmount, month } = req.body;
    if (!category || limitAmount === undefined) {
      return res.status(400).json({ error: 'Category and limitAmount are required.' });
    }

    const numLimit = Number(limitAmount);
    if (isNaN(numLimit) || numLimit <= 0) {
      return res.status(400).json({ error: 'limitAmount must be a positive number.' });
    }

    const currentMonth = month || new Date().toISOString().slice(0, 7);

    const budget = await dbService.budget.upsert({
      where: {
        userId_month_category: {
          userId,
          month: currentMonth,
          category: category.trim()
        }
      },
      update: {
        limitAmount: Math.round(numLimit)
      },
      create: {
        limitAmount: Math.round(numLimit)
      }
    });

    res.status(200).json({
      message: 'Budget saved successfully.',
      budget
    });
  } catch (error: any) {
    console.error('upsertBudget error:', error);
    res.status(500).json({ error: 'Failed to save budget.' });
  }
};

export const deleteBudget = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    await dbService.budget.delete({ where: { id } });
    res.status(200).json({ message: 'Budget removed successfully.' });
  } catch (error: any) {
    console.error('deleteBudget error:', error);
    res.status(500).json({ error: 'Failed to delete budget.' });
  }
};

export const getSavingsGoals = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const goals = await dbService.savingsGoal.findMany({ where: { userId, isArchived: false } });

    // Determine user's monthly surplus from recent income and living expenses
    const allTxs = await dbService.userTransaction.findMany({ where: { userId } });
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthIncome = allTxs.filter(t => t.userId === userId && t.type === 'INCOME' && t.date.slice(0, 7) === currentMonth)
      .reduce((s, t) => s + t.amount, 0) || 60000;
    const monthExpenses = allTxs.filter(t => t.userId === userId && t.type === 'EXPENSE' && t.date.slice(0, 7) === currentMonth)
      .reduce((s, t) => s + t.amount, 0) || 30000;
    const monthlySurplus = Math.max(0, monthIncome - monthExpenses);

    const now = new Date();
    const enrichedGoals = goals.map(g => {
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
      const targetDate = new Date(g.targetDate);
      
      // Calculate months remaining
      const monthsRemaining = Math.max(1, Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4)));
      const requiredMonthlySaving = Math.round(remainingAmount / monthsRemaining);
      const progressPercent = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;

      let feasibility: 'ACHIEVABLE' | 'TIGHT' | 'UNREALISTIC' = 'ACHIEVABLE';
      if (requiredMonthlySaving > monthlySurplus) {
        feasibility = 'UNREALISTIC';
      } else if (requiredMonthlySaving > monthlySurplus * 0.7) {
        feasibility = 'TIGHT';
      }

      return {
        ...g,
        remainingAmount,
        progressPercent,
        monthsRemaining,
        requiredMonthlySaving,
        feasibility,
        isCompleted: g.currentAmount >= g.targetAmount
      };
    });

    const totalTarget = enrichedGoals.reduce((s, g) => s + g.targetAmount, 0);
    const totalCurrent = enrichedGoals.reduce((s, g) => s + g.currentAmount, 0);

    res.status(200).json({
      totalTarget,
      totalCurrent,
      totalProgressPercent: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0,
      monthlySurplusAvailable: monthlySurplus,
      goals: enrichedGoals
    });
  } catch (error: any) {
    console.error('getSavingsGoals error:', error);
    res.status(500).json({ error: 'Failed to retrieve savings goals.' });
  }
};

export const createSavingsGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const { title, targetAmount, targetDate, priority = 'MEDIUM' } = req.body;
    if (!title || !targetAmount || !targetDate) {
      return res.status(400).json({ error: 'Title, targetAmount, and targetDate are required.' });
    }

    const numTarget = Number(targetAmount);
    if (isNaN(numTarget) || numTarget <= 0) {
      return res.status(400).json({ error: 'targetAmount must be a positive number.' });
    }

    const goal = await dbService.savingsGoal.create({
      data: {
        userId,
        title: title.trim(),
        targetAmount: Math.round(numTarget),
        currentAmount: 0,
        targetDate: new Date(targetDate).toISOString(),
        priority: priority.toUpperCase(),
        isArchived: false
      }
    });

    res.status(201).json({
      message: 'Savings goal created successfully.',
      goal
    });
  } catch (error: any) {
    console.error('createSavingsGoal error:', error);
    res.status(500).json({ error: 'Failed to create savings goal.' });
  }
};

export const contributeToGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { amount, recordTransaction = true } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Contribution amount must be positive.' });
    }

    const goal = await dbService.savingsGoal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) {
      return res.status(404).json({ error: 'Savings goal not found or access denied.' });
    }

    const newCurrent = Math.round((goal.currentAmount + numAmount) * 100) / 100;
    const updatedGoal = await dbService.savingsGoal.update({
      where: { id },
      data: { currentAmount: newCurrent }
    });

    // Optional: Record as an expense transaction under Savings & Investments
    if (recordTransaction) {
      await dbService.userTransaction.create({
        data: {
          userId,
          type: 'EXPENSE',
          amount: numAmount,
          category: 'Savings & Investments',
          subCategory: 'Goal Contribution',
          description: `Contribution to ${goal.title}`,
          paymentMethod: 'UPI',
          date: new Date().toISOString(),
          isVerified: true
        }
      });
    }

    res.status(200).json({
      message: `Contributed ₹${numAmount.toLocaleString('en-IN')} to "${goal.title}".`,
      goal: updatedGoal
    });
  } catch (error: any) {
    console.error('contributeToGoal error:', error);
    res.status(500).json({ error: 'Failed to record contribution.' });
  }
};

export const deleteSavingsGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const goal = await dbService.savingsGoal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) {
      return res.status(404).json({ error: 'Savings goal not found or access denied.' });
    }

    await dbService.savingsGoal.delete({ where: { id } });
    res.status(200).json({ message: 'Savings goal removed successfully.' });
  } catch (error: any) {
    console.error('deleteSavingsGoal error:', error);
    res.status(500).json({ error: 'Failed to delete savings goal.' });
  }
};

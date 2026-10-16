import { Request, Response } from 'express';
import { dbService } from '../services/dbService';

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const { type, category, search, startDate, endDate, sortBy = 'date', sortOrder = 'desc', page = '1', limit = '50' } = req.query;

    let transactions = await dbService.userTransaction.findMany({ where: { userId } });

    // Filters
    if (type && typeof type === 'string' && type !== 'ALL') {
      transactions = transactions.filter(t => t.type === type.toUpperCase());
    }
    if (category && typeof category === 'string' && category !== 'ALL') {
      transactions = transactions.filter(t => t.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      transactions = transactions.filter(t => 
        t.description.toLowerCase().includes(q) || 
        t.category.toLowerCase().includes(q) ||
        (t.subCategory && t.subCategory.toLowerCase().includes(q))
      );
    }
    if (startDate && typeof startDate === 'string') {
      const s = new Date(startDate).getTime();
      transactions = transactions.filter(t => new Date(t.date).getTime() >= s);
    }
    if (endDate && typeof endDate === 'string') {
      const e = new Date(endDate).getTime();
      transactions = transactions.filter(t => new Date(t.date).getTime() <= e);
    }

    // Sort
    transactions.sort((a, b) => {
      if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 50);
    const totalCount = transactions.length;
    const paginated = transactions.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.status(200).json({
      transactions: paginated,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum)
    });
  } catch (error: any) {
    console.error('getTransactions error:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const { type, amount, category, subCategory, description, paymentMethod, date, isRecurring } = req.body;

    if (!type || !amount || !category || !description) {
      return res.status(400).json({ error: 'Type, amount, category, and description are required.' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const newTx = await dbService.userTransaction.create({
      data: {
        userId,
        type: type.toUpperCase(),
        amount: Math.round(numAmount * 100) / 100,
        category: category.trim(),
        subCategory: subCategory ? subCategory.trim() : undefined,
        description: description.trim(),
        paymentMethod: paymentMethod || 'UPI',
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        isRecurring: Boolean(isRecurring),
        isVerified: false
      }
    });

    // Check budget warning if this is an expense
    let budgetNotice: string | null = null;
    if (type.toUpperCase() === 'EXPENSE') {
      const currentMonth = (date ? new Date(date) : new Date()).toISOString().slice(0, 7);
      const budgets = await dbService.budget.findMany({ where: { userId, month: currentMonth } });
      const matchingBudget = budgets.find(b => b.category.toLowerCase() === category.trim().toLowerCase());
      if (matchingBudget) {
        // Calculate new spent
        const allTxs = await dbService.userTransaction.findMany({ where: { userId, type: 'EXPENSE' } });
        const monthTxs = allTxs.filter(t => t.date.slice(0, 7) === currentMonth && t.category.toLowerCase() === category.trim().toLowerCase());
        const totalSpent = monthTxs.reduce((sum, t) => sum + t.amount, 0);
        const percent = Math.round((totalSpent / matchingBudget.limitAmount) * 100);

        if (percent >= 100) {
          budgetNotice = `Warning: You have exceeded your ${matchingBudget.category} budget for ${currentMonth} (${percent}% utilised, ₹${totalSpent} / ₹${matchingBudget.limitAmount}).`;
        } else if (percent >= 80) {
          budgetNotice = `Notice: You have consumed ${percent}% of your ${matchingBudget.category} budget for ${currentMonth}.`;
        }
      }
    }

    res.status(201).json({
      message: 'Transaction recorded successfully.',
      transaction: newTx,
      budgetNotice
    });
  } catch (error: any) {
    console.error('createTransaction error:', error);
    res.status(500).json({ error: 'Failed to record transaction.' });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const existing = await dbService.userTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Transaction not found or access denied.' });
    }

    const { type, amount, category, subCategory, description, paymentMethod, date, isRecurring } = req.body;
    const updateData: any = {};
    if (type) updateData.type = type.toUpperCase();
    if (amount) updateData.amount = Math.round(Number(amount) * 100) / 100;
    if (category) updateData.category = category.trim();
    if (subCategory !== undefined) updateData.subCategory = subCategory ? subCategory.trim() : undefined;
    if (description) updateData.description = description.trim();
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (date) updateData.date = new Date(date).toISOString();
    if (isRecurring !== undefined) updateData.isRecurring = Boolean(isRecurring);

    const updated = await dbService.userTransaction.update({ where: { id }, data: updateData });
    res.status(200).json({ message: 'Transaction updated successfully.', transaction: updated });
  } catch (error: any) {
    console.error('updateTransaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction.' });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const existing = await dbService.userTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Transaction not found or access denied.' });
    }

    await dbService.userTransaction.delete({ where: { id } });
    res.status(200).json({ message: 'Transaction deleted successfully.' });
  } catch (error: any) {
    console.error('deleteTransaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction.' });
  }
};

export const getTransactionSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const { month } = req.query; // e.g. "2026-10"
    const targetMonth = (typeof month === 'string' && month) ? month : new Date().toISOString().slice(0, 7);

    const allTxs = await dbService.userTransaction.findMany({ where: { userId } });
    const currentMonthTxs = allTxs.filter(t => t.date.slice(0, 7) === targetMonth);

    // Compute previous month for comparison
    const [y, m] = targetMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthStr = prevDate.toISOString().slice(0, 7);
    const prevMonthTxs = allTxs.filter(t => t.date.slice(0, 7) === prevMonthStr);

    const totalIncome = currentMonthTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = currentMonthTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const netCashflow = totalIncome - totalExpenses;

    const prevIncome = prevMonthTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevMonthTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    currentMonthTxs.filter(t => t.type === 'EXPENSE').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const categoryColors = [
      '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#EC4899', '#06B6D4', '#14B8A6', '#F97316', '#64748B'
    ];

    const categoryBreakdown = Object.entries(categoryTotals).map(([name, amount], idx) => ({
      name,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      color: categoryColors[idx % categoryColors.length]
    })).sort((a, b) => b.amount - a.amount);

    res.status(200).json({
      month: targetMonth,
      totalIncome: Math.round(totalIncome),
      totalExpenses: Math.round(totalExpenses),
      netCashflow: Math.round(netCashflow),
      transactionCount: currentMonthTxs.length,
      previousMonth: {
        month: prevMonthStr,
        totalIncome: Math.round(prevIncome),
        totalExpenses: Math.round(prevExpenses),
        expenseChangePercent: prevExpenses > 0 ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 100) : 0
      },
      categoryBreakdown
    });
  } catch (error: any) {
    console.error('getTransactionSummary error:', error);
    res.status(500).json({ error: 'Failed to generate transaction summary.' });
  }
};

export const importCsvTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const { csvRows } = req.body;
    if (!Array.isArray(csvRows) || csvRows.length === 0) {
      return res.status(400).json({ error: 'csvRows must be a non-empty array of transaction rows.' });
    }

    const existingTxs = await dbService.userTransaction.findMany({ where: { userId } });
    const imported: any[] = [];
    const skipped: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const rowNum = i + 1;

      // Validation
      const amount = Number(row.amount);
      const type = (row.type || 'EXPENSE').toUpperCase();
      const category = row.category || 'General';
      const description = row.description || 'Imported Transaction';
      const date = row.date ? new Date(row.date) : new Date();

      if (isNaN(amount) || amount <= 0) {
        errors.push(`Row ${rowNum}: Invalid amount "${row.amount}".`);
        continue;
      }
      if (type !== 'INCOME' && type !== 'EXPENSE') {
        errors.push(`Row ${rowNum}: Type must be INCOME or EXPENSE.`);
        continue;
      }
      if (isNaN(date.getTime())) {
        errors.push(`Row ${rowNum}: Invalid date format "${row.date}".`);
        continue;
      }

      // Duplicate check (same date, amount, description)
      const isDuplicate = existingTxs.some(t => 
        t.type === type && 
        Math.abs(t.amount - amount) < 0.01 && 
        t.description.toLowerCase() === description.toLowerCase() &&
        t.date.slice(0, 10) === date.toISOString().slice(0, 10)
      );

      if (isDuplicate) {
        skipped.push({ rowNum, description, amount, reason: 'Duplicate transaction detected.' });
        continue;
      }

      const newTx = await dbService.userTransaction.create({
        data: {
          userId,
          type,
          amount: Math.round(amount * 100) / 100,
          category: category.trim(),
          subCategory: row.subCategory || undefined,
          description: description.trim(),
          paymentMethod: row.paymentMethod || 'BANK_TRANSFER',
          date: date.toISOString(),
          isRecurring: Boolean(row.isRecurring),
          isVerified: true
        }
      });
      imported.push(newTx);
    }

    res.status(200).json({
      message: `Successfully imported ${imported.length} transactions. Skipped ${skipped.length} duplicates.`,
      importedCount: imported.length,
      skippedCount: skipped.length,
      errorsCount: errors.length,
      skipped,
      errors,
      imported
    });
  } catch (error: any) {
    console.error('importCsvTransactions error:', error);
    res.status(500).json({ error: 'Failed to process CSV import.' });
  }
};

export const exportCsvTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const transactions = await dbService.userTransaction.findMany({ where: { userId } });

    const headers = ['ID', 'Date', 'Type', 'Category', 'SubCategory', 'Description', 'Payment Method', 'Amount (INR)', 'Verified'];
    const rows = transactions.map(t => [
      t.id,
      t.date ? t.date.slice(0, 10) : '',
      t.type,
      `"${t.category.replace(/"/g, '""')}"`,
      `"${(t.subCategory || '').replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.paymentMethod || 'UPI',
      t.amount.toFixed(2),
      t.isVerified ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="spendify_transactions_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('exportCsvTransactions error:', error);
    res.status(500).json({ error: 'Failed to export transactions CSV.' });
  }
};

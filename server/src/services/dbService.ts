import { prisma, mockDb, checkDbConnection } from '../config/db';

let useMock = false;

// Initialize connection status
checkDbConnection().then((connected) => {
  useMock = !connected;
});

export const dbService = {
  isMock: () => useMock,
  setUseMock: (val: boolean) => { useMock = val; },

  // --- USER OPERATIONS ---
  user: {
    findUnique: async (args: { where: { id?: string; email?: string; phone?: string } }) => {
      if (!useMock) {
        try {
          return await prisma.user.findUnique(args as any);
        } catch {
          useMock = true;
        }
      }
      return mockDb.users.find(u => 
        (args.where.id && u.id === args.where.id) ||
        (args.where.email && u.email === args.where.email) ||
        (args.where.phone && u.phone === args.where.phone)
      ) || null;
    },
    create: async (args: { data: any }) => {
      if (!useMock) {
        try {
          return await prisma.user.create(args);
        } catch {
          useMock = true;
        }
      }
      const newUser = {
        id: Math.random().toString(36).substring(2, 15),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data
      };
      mockDb.users.push(newUser);
      return newUser;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (!useMock) {
        try {
          return await prisma.user.update(args);
        } catch {
          useMock = true;
        }
      }
      const idx = mockDb.users.findIndex(u => u.id === args.where.id);
      if (idx !== -1) {
        mockDb.users[idx] = { ...mockDb.users[idx], ...args.data, updatedAt: new Date() };
        return mockDb.users[idx];
      }
      throw new Error('User not found');
    },
    findMany: async () => {
      if (!useMock) {
        try {
          return await prisma.user.findMany({
            include: { kycDoc: true, loans: true }
          });
        } catch {
          useMock = true;
        }
      }
      return mockDb.users.map(u => ({
        ...u,
        kycDoc: mockDb.kycDocuments.find(k => k.userId === u.id) || null,
        loans: mockDb.loans.filter(l => l.userId === u.id)
      }));
    }
  },

  // --- KYC OPERATIONS ---
  kycDocument: {
    findUnique: async (args: { where: { userId: string } }) => {
      if (!useMock) {
        try {
          return await prisma.kYCDocument.findUnique(args);
        } catch {
          useMock = true;
        }
      }
      return mockDb.kycDocuments.find(k => k.userId === args.where.userId) || null;
    },
    findMany: async () => {
      if (!useMock) {
        try {
          return await prisma.kYCDocument.findMany({
            include: { user: true }
          });
        } catch {
          useMock = true;
        }
      }
      return mockDb.kycDocuments.map(k => ({
        ...k,
        user: mockDb.users.find(u => u.id === k.userId) || null
      }));
    },
    upsert: async (args: { where: { userId: string }; create: any; update: any }) => {
      if (!useMock) {
        try {
          return await prisma.kYCDocument.upsert(args);
        } catch {
          useMock = true;
        }
      }
      const idx = mockDb.kycDocuments.findIndex(k => k.userId === args.where.userId);
      if (idx !== -1) {
        mockDb.kycDocuments[idx] = { ...mockDb.kycDocuments[idx], ...args.update, updatedAt: new Date() };
        return mockDb.kycDocuments[idx];
      } else {
        const newKyc = {
          id: Math.random().toString(36).substring(2, 15),
          userId: args.where.userId,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.create
        };
        mockDb.kycDocuments.push(newKyc);
        return newKyc;
      }
    },
    update: async (args: { where: { id?: string; userId?: string }; data: any }) => {
      if (!useMock) {
        try {
          return await prisma.kYCDocument.update(args as any);
        } catch {
          useMock = true;
        }
      }
      const idx = mockDb.kycDocuments.findIndex(k => 
        (args.where.id && k.id === args.where.id) ||
        (args.where.userId && k.userId === args.where.userId)
      );
      if (idx !== -1) {
        mockDb.kycDocuments[idx] = { ...mockDb.kycDocuments[idx], ...args.data, updatedAt: new Date() };
        return mockDb.kycDocuments[idx];
      }
      throw new Error('KYC document not found');
    }
  },

  // --- LOAN OPERATIONS ---
  loan: {
    findMany: async (args?: { where: { userId?: string } }) => {
      if (!useMock) {
        try {
          const loans = await prisma.loan.findMany({
            where: args?.where,
            include: { prediction: true, recommendation: true }
          });
          loans.forEach(l => {
            if (l.prediction && typeof l.prediction.shapExplanation === 'string') {
              try {
                l.prediction.shapExplanation = JSON.parse(l.prediction.shapExplanation) as any;
              } catch {}
            }
          });
          return loans;
        } catch {
          useMock = true;
        }
      }
      const filter = args?.where?.userId;
      const list = filter ? mockDb.loans.filter(l => l.userId === filter) : mockDb.loans;
      return list.map(l => ({
        ...l,
        prediction: mockDb.predictions.find(p => p.loanId === l.id) || null,
        recommendation: mockDb.recommendations.find(r => r.loanId === l.id) || null
      }));
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (!useMock) {
        try {
          const loan = await prisma.loan.findUnique({
            where: args.where,
            include: { prediction: true, recommendation: true, user: true }
          });
          if (loan?.prediction && typeof loan.prediction.shapExplanation === 'string') {
            try {
              loan.prediction.shapExplanation = JSON.parse(loan.prediction.shapExplanation) as any;
            } catch {}
          }
          return loan;
        } catch {
          useMock = true;
        }
      }
      const loan = mockDb.loans.find(l => l.id === args.where.id);
      if (!loan) return null;
      return {
        ...loan,
        user: mockDb.users.find(u => u.id === loan.userId) || null,
        prediction: mockDb.predictions.find(p => p.loanId === loan.id) || null,
        recommendation: mockDb.recommendations.find(r => r.loanId === loan.id) || null
      };
    },
    create: async (args: { data: any }) => {
      if (!useMock) {
        try {
          return await prisma.loan.create(args);
        } catch {
          useMock = true;
        }
      }
      const newLoan = {
        id: Math.random().toString(36).substring(2, 15),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data
      };
      mockDb.loans.push(newLoan);
      return newLoan;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (!useMock) {
        try {
          return await prisma.loan.update(args);
        } catch {
          useMock = true;
        }
      }
      const idx = mockDb.loans.findIndex(l => l.id === args.where.id);
      if (idx !== -1) {
        mockDb.loans[idx] = { ...mockDb.loans[idx], ...args.data, updatedAt: new Date() };
        return mockDb.loans[idx];
      }
      throw new Error('Loan not found');
    }
  },

  // --- AI PREDICTION OPERATIONS ---
  aiPrediction: {
    findUnique: async (args: { where: { loanId: string } }) => {
      if (!useMock) {
        try {
          const pred = await prisma.aIPrediction.findUnique(args);
          if (pred && typeof pred.shapExplanation === 'string') {
            try {
              pred.shapExplanation = JSON.parse(pred.shapExplanation) as any;
            } catch {}
          }
          return pred;
        } catch {
          useMock = true;
        }
      }
      return mockDb.predictions.find(p => p.loanId === args.where.loanId) || null;
    },
    create: async (args: { data: any }) => {
      if (!useMock) {
        try {
          const dataCopy = { ...args.data };
          if (dataCopy.shapExplanation && typeof dataCopy.shapExplanation !== 'string') {
            dataCopy.shapExplanation = JSON.stringify(dataCopy.shapExplanation);
          }
          const pred = await prisma.aIPrediction.create({ ...args, data: dataCopy });
          if (pred && typeof pred.shapExplanation === 'string') {
            try {
              pred.shapExplanation = JSON.parse(pred.shapExplanation) as any;
            } catch {}
          }
          return pred;
        } catch {
          useMock = true;
        }
      }
      const newPrediction = {
        id: Math.random().toString(36).substring(2, 15),
        createdAt: new Date(),
        ...args.data
      };
      mockDb.predictions.push(newPrediction);
      return newPrediction;
    }
  },

  // --- LOAN RECOMMENDATION OPERATIONS ---
  loanRecommendation: {
    create: async (args: { data: any }) => {
      if (!useMock) {
        try {
          return await prisma.loanRecommendation.create(args);
        } catch {
          useMock = true;
        }
      }
      const newRec = {
        id: Math.random().toString(36).substring(2, 15),
        createdAt: new Date(),
        ...args.data
      };
      mockDb.recommendations.push(newRec);
      return newRec;
    }
  },

  // --- ALERT OPERATIONS ---
  alert: {
    findMany: async (args: { where: { userId?: string; resolved?: boolean } }) => {
      if (!useMock) {
        try {
          return await prisma.alert.findMany(args);
        } catch {
          useMock = true;
        }
      }
      return mockDb.alerts.filter(a => 
        (!args.where.userId || a.userId === args.where.userId) &&
        (args.where.resolved === undefined || a.resolved === args.where.resolved)
      );
    },
    create: async (args: { data: any }) => {
      if (!useMock) {
        try {
          return await prisma.alert.create(args);
        } catch {
          useMock = true;
        }
      }
      const newAlert = {
        id: Math.random().toString(36).substring(2, 15),
        resolved: false,
        createdAt: new Date(),
        ...args.data
      };
      mockDb.alerts.push(newAlert);
      return newAlert;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (!useMock) {
        try {
          return await prisma.alert.update(args);
        } catch {
          useMock = true;
        }
      }
      const idx = mockDb.alerts.findIndex(a => a.id === args.where.id);
      if (idx !== -1) {
        mockDb.alerts[idx] = { ...mockDb.alerts[idx], ...args.data };
        return mockDb.alerts[idx];
      }
      throw new Error('Alert not found');
    }
  },

  // --- TRANSACTION OPERATIONS ---
  transaction: {
    findMany: async (args?: { where: { loan: { userId: string } } }) => {
      if (!useMock) {
        try {
          return await prisma.transaction.findMany({
            where: args?.where,
            include: { loan: true }
          });
        } catch {
          useMock = true;
        }
      }
      const userId = args?.where?.loan?.userId;
      if (!userId) return mockDb.transactions;
      const userLoans = mockDb.loans.filter(l => l.userId === userId).map(l => l.id);
      return mockDb.transactions
        .filter(t => userLoans.includes(t.loanId))
        .map(t => ({
          ...t,
          loan: mockDb.loans.find(l => l.id === t.loanId)
        }));
    },
    create: async (args: { data: any }) => {
      if (!useMock) {
        try {
          return await prisma.transaction.create(args);
        } catch {
          useMock = true;
        }
      }
      const newTx = {
        id: Math.random().toString(36).substring(2, 15),
        createdAt: new Date(),
        status: 'SUCCESS',
        ...args.data
      };
      mockDb.transactions.push(newTx);
      return newTx;
    }
  },

  // --- CHAT OPERATIONS ---
  chatHistory: {
    findMany: async (args: { where: { userId: string } }) => {
      if (!useMock) {
        try {
          return await prisma.chatHistory.findMany({
            where: args.where,
            orderBy: { createdAt: 'asc' }
          });
        } catch {
          useMock = true;
        }
      }
      return mockDb.chats
        .filter(c => c.userId === args.where.userId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
    create: async (args: { data: any }) => {
      if (!useMock) {
        try {
          return await prisma.chatHistory.create(args);
        } catch {
          useMock = true;
        }
      }
      const newChat = {
        id: Math.random().toString(36).substring(2, 15),
        isBot: false,
        createdAt: new Date(),
        ...args.data
      };
      mockDb.chats.push(newChat);
      return newChat;
    }
  },

  // --- REPAYMENT SCHEDULE OPERATIONS ---
  repaymentSchedule: {
    findMany: async (args?: { where?: { loanId?: string; loan?: { userId?: string } } }) => {
      const loanId = args?.where?.loanId;
      if (loanId) {
        return mockDb.repayments.filter(r => r.loanId === loanId);
      }
      return mockDb.repayments;
    },
    findUnique: async (args: { where: { id: string } }) => {
      return mockDb.repayments.find(r => r.id === args.where.id) || null;
    },
    create: async (args: { data: any }) => {
      const newRepayment = {
        id: args.data.id || Math.random().toString(36).substring(2, 15),
        status: 'UPCOMING',
        createdAt: new Date(),
        ...args.data
      };
      mockDb.repayments.push(newRepayment);
      return newRepayment;
    },
    createMany: async (args: { data: any[] }) => {
      args.data.forEach(item => {
        const newRepayment = {
          id: item.id || Math.random().toString(36).substring(2, 15),
          status: item.status || 'UPCOMING',
          createdAt: new Date(),
          ...item
        };
        mockDb.repayments.push(newRepayment);
      });
      return { count: args.data.length };
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const idx = mockDb.repayments.findIndex(r => r.id === args.where.id);
      if (idx !== -1) {
        mockDb.repayments[idx] = { ...mockDb.repayments[idx], ...args.data };
        return mockDb.repayments[idx];
      }
      throw new Error('Repayment instalment not found');
    }
  },

  // --- AUDIT LOG OPERATIONS ---
  auditLog: {
    findMany: async () => {
      return mockDb.auditLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    create: async (args: { data: any }) => {
      const newLog = {
        id: Math.random().toString(36).substring(2, 15),
        createdAt: new Date(),
        ...args.data
      };
      mockDb.auditLogs.push(newLog);
      return newLog;
    }
  },

  // --- USER TRANSACTION & EXPENSE TRACKER OPERATIONS ---
  userTransaction: {
    findMany: async (args?: { where?: { userId?: string; type?: string; category?: string } }) => {
      let list = mockDb.userTransactions;
      if (args?.where?.userId) {
        list = list.filter(t => t.userId === args.where!.userId);
      }
      if (args?.where?.type) {
        list = list.filter(t => t.type === args.where!.type);
      }
      if (args?.where?.category) {
        list = list.filter(t => t.category === args.where!.category);
      }
      return list.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    },
    findUnique: async (args: { where: { id: string } }) => {
      return mockDb.userTransactions.find(t => t.id === args.where.id) || null;
    },
    create: async (args: { data: any }) => {
      const newTx = {
        id: 'tx-' + Math.random().toString(36).substring(2, 11),
        createdAt: new Date(),
        ...args.data
      };
      mockDb.userTransactions.push(newTx);
      return newTx;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const idx = mockDb.userTransactions.findIndex(t => t.id === args.where.id);
      if (idx !== -1) {
        mockDb.userTransactions[idx] = { ...mockDb.userTransactions[idx], ...args.data };
        return mockDb.userTransactions[idx];
      }
      throw new Error('Transaction not found');
    },
    delete: async (args: { where: { id: string } }) => {
      const idx = mockDb.userTransactions.findIndex(t => t.id === args.where.id);
      if (idx !== -1) {
        const deleted = mockDb.userTransactions.splice(idx, 1)[0];
        return deleted;
      }
      throw new Error('Transaction not found');
    }
  },

  // --- BUDGET OPERATIONS ---
  budget: {
    findMany: async (args?: { where?: { userId?: string; month?: string } }) => {
      let list = mockDb.budgets;
      if (args?.where?.userId) {
        list = list.filter(b => b.userId === args.where!.userId);
      }
      if (args?.where?.month) {
        list = list.filter(b => b.month === args.where!.month);
      }
      return list;
    },
    upsert: async (args: { where: { userId_month_category: { userId: string; month: string; category: string } }; update: any; create: any }) => {
      const { userId, month, category } = args.where.userId_month_category;
      const idx = mockDb.budgets.findIndex(b => b.userId === userId && b.month === month && b.category === category);
      if (idx !== -1) {
        mockDb.budgets[idx] = { ...mockDb.budgets[idx], ...args.update };
        return mockDb.budgets[idx];
      } else {
        const newBudget = {
          id: 'bgt-' + Math.random().toString(36).substring(2, 11),
          userId,
          month,
          category,
          createdAt: new Date(),
          ...args.create
        };
        mockDb.budgets.push(newBudget);
        return newBudget;
      }
    },
    delete: async (args: { where: { id: string } }) => {
      const idx = mockDb.budgets.findIndex(b => b.id === args.where.id);
      if (idx !== -1) {
        return mockDb.budgets.splice(idx, 1)[0];
      }
      throw new Error('Budget not found');
    }
  },

  // --- SAVINGS GOALS OPERATIONS ---
  savingsGoal: {
    findMany: async (args?: { where?: { userId?: string; isArchived?: boolean } }) => {
      let list = mockDb.savingsGoals;
      if (args?.where?.userId) {
        list = list.filter(g => g.userId === args.where!.userId);
      }
      if (args?.where?.isArchived !== undefined) {
        list = list.filter(g => g.isArchived === args.where!.isArchived);
      }
      return list.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
    },
    findUnique: async (args: { where: { id: string } }) => {
      return mockDb.savingsGoals.find(g => g.id === args.where.id) || null;
    },
    create: async (args: { data: any }) => {
      const newGoal = {
        id: 'goal-' + Math.random().toString(36).substring(2, 11),
        currentAmount: 0,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data
      };
      mockDb.savingsGoals.push(newGoal);
      return newGoal;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const idx = mockDb.savingsGoals.findIndex(g => g.id === args.where.id);
      if (idx !== -1) {
        mockDb.savingsGoals[idx] = { ...mockDb.savingsGoals[idx], ...args.data, updatedAt: new Date() };
        return mockDb.savingsGoals[idx];
      }
      throw new Error('Savings goal not found');
    },
    delete: async (args: { where: { id: string } }) => {
      const idx = mockDb.savingsGoals.findIndex(g => g.id === args.where.id);
      if (idx !== -1) {
        return mockDb.savingsGoals.splice(idx, 1)[0];
      }
      throw new Error('Savings goal not found');
    }
  },

  // --- SAVED LOAN SCENARIOS OPERATIONS ---
  savedScenario: {
    findMany: async (args?: { where?: { userId?: string } }) => {
      let list = mockDb.savedScenarios;
      if (args?.where?.userId) {
        list = list.filter(s => s.userId === args.where!.userId);
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    create: async (args: { data: any }) => {
      const newScenario = {
        id: 'scen-' + Math.random().toString(36).substring(2, 11),
        createdAt: new Date(),
        ...args.data
      };
      mockDb.savedScenarios.push(newScenario);
      return newScenario;
    },
    delete: async (args: { where: { id: string } }) => {
      const idx = mockDb.savedScenarios.findIndex(s => s.id === args.where.id);
      if (idx !== -1) {
        return mockDb.savedScenarios.splice(idx, 1)[0];
      }
      throw new Error('Scenario not found');
    }
  },

  // --- LOAN APPLICATION DRAFT OPERATIONS ---
  loanDraft: {
    findUnique: async (args: { where: { userId: string } }) => {
      return mockDb.loanDrafts.find(d => d.userId === args.where.userId) || null;
    },
    upsert: async (args: { where: { userId: string }; create: any; update: any }) => {
      const idx = mockDb.loanDrafts.findIndex(d => d.userId === args.where.userId);
      if (idx !== -1) {
        mockDb.loanDrafts[idx] = { ...mockDb.loanDrafts[idx], ...args.update, updatedAt: new Date() };
        return mockDb.loanDrafts[idx];
      } else {
        const newDraft = {
          id: 'draft-' + Math.random().toString(36).substring(2, 11),
          userId: args.where.userId,
          updatedAt: new Date(),
          ...args.create
        };
        mockDb.loanDrafts.push(newDraft);
        return newDraft;
      }
    },
    delete: async (args: { where: { userId: string } }) => {
      const idx = mockDb.loanDrafts.findIndex(d => d.userId === args.where.userId);
      if (idx !== -1) {
        return mockDb.loanDrafts.splice(idx, 1)[0];
      }
      return null;
    }
  }
};

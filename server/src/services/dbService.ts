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
  }
};

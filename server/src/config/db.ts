import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

let prisma: PrismaClient;

try {
  prisma = new PrismaClient();
} catch (error) {
  console.warn('Prisma client instantiation error. Fallback will be handled.', error);
}

export const SAMPLE_PROFILES_DATA = [
  {
    id: 'user-1',
    email: 'aarav.sharma@spendify.com',
    name: 'Aarav Sharma',
    phone: '+919876543210',
    role: 'BORROWER',
    aadhaarNumber: '987654321001',
    panNumber: 'AARAV1234A',
    kycStatus: 'APPROVED',
    occupation: 'Senior Tech Lead',
    creditScore: 785,
    financialHealth: 88.5,
    riskCategory: 'LOW',
    defaultProbability: 0.08,
    spendingHabits: {
      categories: [
        { name: 'Savings & Investments', percentage: 35, color: '#2E7D32' },
        { name: 'Rent & Utilities', percentage: 25, color: '#1976D2' },
        { name: 'Dining & Gadgets', percentage: 20, color: '#ED6C02' },
        { name: 'Groceries & Household', percentage: 20, color: '#0288D1' }
      ],
      monthlyIncome: 95000,
      monthlyExpenses: 61750,
      savingsRate: '35%',
      spendingPattern: 'Disciplined Saver & Investor'
    },
    loanAmount: 50000,
    loanTenure: 12,
    loanInterestRate: 12.5,
    loanEmi: 4450,
    loanStatus: 'APPROVED'
  },
  {
    id: 'user-2',
    email: 'priya.patel@spendify.com',
    name: 'Priya Patel',
    phone: '+919876543211',
    role: 'BORROWER',
    aadhaarNumber: '987654321002',
    panNumber: 'PRIYA1234P',
    kycStatus: 'APPROVED',
    occupation: 'Freelance UI/UX Designer',
    creditScore: 690,
    financialHealth: 72.0,
    riskCategory: 'MEDIUM',
    defaultProbability: 0.22,
    spendingHabits: {
      categories: [
        { name: 'Design Assets & Tech', percentage: 40, color: '#9C27B0' },
        { name: 'Lifestyle & Co-working', percentage: 30, color: '#ED6C02' },
        { name: 'Rent & Bills', percentage: 15, color: '#1976D2' },
        { name: 'Emergency Fund', percentage: 15, color: '#2E7D32' }
      ],
      monthlyIncome: 65000,
      monthlyExpenses: 55250,
      savingsRate: '15%',
      spendingPattern: 'Variable Freelance Earner'
    },
    loanAmount: 30000,
    loanTenure: 6,
    loanInterestRate: 14.0,
    loanEmi: 5200,
    loanStatus: 'APPROVED'
  },
  {
    id: 'user-3',
    email: 'rahul.verma@spendify.com',
    name: 'Rahul Verma',
    phone: '+919876543212',
    role: 'BORROWER',
    aadhaarNumber: '987654321003',
    panNumber: 'RAHUL1234R',
    kycStatus: 'PENDING',
    occupation: 'E-commerce Delivery Partner',
    creditScore: 615,
    financialHealth: 58.0,
    riskCategory: 'MEDIUM',
    defaultProbability: 0.35,
    spendingHabits: {
      categories: [
        { name: 'Vehicle Fuel & Maint', percentage: 45, color: '#D32F2F' },
        { name: 'Household Essentials', percentage: 35, color: '#0288D1' },
        { name: 'Daily Food & Tea', percentage: 15, color: '#ED6C02' },
        { name: 'Micro Savings', percentage: 5, color: '#2E7D32' }
      ],
      monthlyIncome: 32000,
      monthlyExpenses: 30400,
      savingsRate: '5%',
      spendingPattern: 'High Operational Spend'
    },
    loanAmount: 15000,
    loanTenure: 3,
    loanInterestRate: 15.0,
    loanEmi: 5120,
    loanStatus: 'PENDING'
  },
  {
    id: 'user-4',
    email: 'ananya.roy@spendify.com',
    name: 'Ananya Roy',
    phone: '+919876543213',
    role: 'BORROWER',
    aadhaarNumber: '987654321004',
    panNumber: 'ANANY1234A',
    kycStatus: 'APPROVED',
    occupation: 'Digital Content Creator',
    creditScore: 740,
    financialHealth: 80.0,
    riskCategory: 'LOW',
    defaultProbability: 0.12,
    spendingHabits: {
      categories: [
        { name: 'Travel & Studio Gear', percentage: 30, color: '#00838F' },
        { name: 'Apartment Rent', percentage: 30, color: '#1976D2' },
        { name: 'Dining & Social', percentage: 25, color: '#E65100' },
        { name: 'Mutual Funds', percentage: 15, color: '#2E7D32' }
      ],
      monthlyIncome: 82000,
      monthlyExpenses: 69700,
      savingsRate: '15%',
      spendingPattern: 'Growth-Focused Creator'
    },
    loanAmount: 40000,
    loanTenure: 12,
    loanInterestRate: 13.0,
    loanEmi: 3570,
    loanStatus: 'APPROVED'
  },
  {
    id: 'user-5',
    email: 'vikram.singh@spendify.com',
    name: 'Vikram Singh',
    phone: '+919876543214',
    role: 'BORROWER',
    aadhaarNumber: '987654321005',
    panNumber: 'VIKRA1234V',
    kycStatus: 'APPROVED',
    occupation: 'Local Kirana Shop Owner',
    creditScore: 810,
    financialHealth: 92.0,
    riskCategory: 'LOW',
    defaultProbability: 0.05,
    spendingHabits: {
      categories: [
        { name: 'Wholesale Inventory', percentage: 50, color: '#1565C0' },
        { name: 'Family Expenses', percentage: 25, color: '#0288D1' },
        { name: 'Shop Expansion', percentage: 15, color: '#6A1B9A' },
        { name: 'Fixed Deposit', percentage: 10, color: '#2E7D32' }
      ],
      monthlyIncome: 110000,
      monthlyExpenses: 99000,
      savingsRate: '10%',
      spendingPattern: 'High Cashflow Merchant'
    },
    loanAmount: 75000,
    loanTenure: 18,
    loanInterestRate: 11.5,
    loanEmi: 4560,
    loanStatus: 'ACTIVE'
  },
  {
    id: 'user-6',
    email: 'sneha.kulkarni@spendify.com',
    name: 'Sneha Kulkarni',
    phone: '+919876543215',
    role: 'BORROWER',
    aadhaarNumber: '987654321006',
    panNumber: 'SNEHA1234S',
    kycStatus: 'APPROVED',
    occupation: 'Primary School Teacher',
    creditScore: 760,
    financialHealth: 84.0,
    riskCategory: 'LOW',
    defaultProbability: 0.09,
    spendingHabits: {
      categories: [
        { name: 'Household & Rent', percentage: 40, color: '#1976D2' },
        { name: 'Education & Books', percentage: 25, color: '#6A1B9A' },
        { name: 'Post Office Savings', percentage: 20, color: '#2E7D32' },
        { name: 'Utilities & Health', percentage: 15, color: '#00838F' }
      ],
      monthlyIncome: 48000,
      monthlyExpenses: 38400,
      savingsRate: '20%',
      spendingPattern: 'Conservative Budgeting'
    },
    loanAmount: 25000,
    loanTenure: 12,
    loanInterestRate: 12.0,
    loanEmi: 2220,
    loanStatus: 'APPROVED'
  },
  {
    id: 'user-7',
    email: 'rohan.mehta@spendify.com',
    name: 'Rohan Mehta',
    phone: '+919876543216',
    role: 'BORROWER',
    aadhaarNumber: '987654321007',
    panNumber: 'ROHAN1234R',
    kycStatus: 'APPROVED',
    occupation: 'Boutique Cafe Barista',
    creditScore: 580,
    financialHealth: 49.0,
    riskCategory: 'HIGH',
    defaultProbability: 0.52,
    spendingHabits: {
      categories: [
        { name: 'Weekend Dining & Clubs', percentage: 50, color: '#C62828' },
        { name: 'Impulse Shopping', percentage: 30, color: '#EF6C00' },
        { name: 'Shared Room Rent', percentage: 15, color: '#1565C0' },
        { name: 'Credit Overdraft', percentage: 5, color: '#AD1457' }
      ],
      monthlyIncome: 28000,
      monthlyExpenses: 29400,
      savingsRate: '0%',
      spendingPattern: 'Over-Leveraged Spender'
    },
    loanAmount: 20000,
    loanTenure: 6,
    loanInterestRate: 16.5,
    loanEmi: 3500,
    loanStatus: 'PENDING'
  },
  {
    id: 'user-8',
    email: 'meera.nair@spendify.com',
    name: 'Meera Nair',
    phone: '+919876543217',
    role: 'BORROWER',
    aadhaarNumber: '987654321008',
    panNumber: 'MEERA1234M',
    kycStatus: 'APPROVED',
    occupation: 'Healthcare Assistant',
    creditScore: 720,
    financialHealth: 76.0,
    riskCategory: 'LOW',
    defaultProbability: 0.14,
    spendingHabits: {
      categories: [
        { name: 'Home Essentials', percentage: 45, color: '#0288D1' },
        { name: 'Medical Insurance', percentage: 25, color: '#C62828' },
        { name: 'Gold SIP Savings', percentage: 20, color: '#2E7D32' },
        { name: 'Commute & Travel', percentage: 10, color: '#EF6C00' }
      ],
      monthlyIncome: 42000,
      monthlyExpenses: 33600,
      savingsRate: '20%',
      spendingPattern: 'Prudent Healthcare Worker'
    },
    loanAmount: 35000,
    loanTenure: 12,
    loanInterestRate: 13.0,
    loanEmi: 3120,
    loanStatus: 'APPROVED'
  },
  {
    id: 'user-9',
    email: 'karan.kapoor@spendify.com',
    name: 'Karan Kapoor',
    phone: '+919876543218',
    role: 'BORROWER',
    aadhaarNumber: '987654321009',
    panNumber: 'KARAN1234K',
    kycStatus: 'PENDING',
    occupation: 'Rideshare Driver',
    creditScore: 540,
    financialHealth: 42.0,
    riskCategory: 'CRITICAL',
    defaultProbability: 0.68,
    spendingHabits: {
      categories: [
        { name: 'Car Loan EMI & Fuel', percentage: 55, color: '#C62828' },
        { name: 'Personal Cash Spend', percentage: 30, color: '#EF6C00' },
        { name: 'Mechanic Repairs', percentage: 10, color: '#1565C0' },
        { name: 'Late Penalty Fees', percentage: 5, color: '#AD1457' }
      ],
      monthlyIncome: 35000,
      monthlyExpenses: 37500,
      savingsRate: '0%',
      spendingPattern: 'Debt Stress Burden'
    },
    loanAmount: 18000,
    loanTenure: 6,
    loanInterestRate: 18.0,
    loanEmi: 3200,
    loanStatus: 'PENDING'
  },
  {
    id: 'user-10',
    email: 'neha.gupta@spendify.com',
    name: 'Neha Gupta',
    phone: '+919876543219',
    role: 'BORROWER',
    aadhaarNumber: '987654321010',
    panNumber: 'NEHAG1234N',
    kycStatus: 'APPROVED',
    occupation: 'Online Micro-entrepreneur',
    creditScore: 830,
    financialHealth: 94.0,
    riskCategory: 'LOW',
    defaultProbability: 0.04,
    spendingHabits: {
      categories: [
        { name: 'Raw Materials', percentage: 40, color: '#2E7D32' },
        { name: 'High-Yield Savings & FD', percentage: 30, color: '#1565C0' },
        { name: 'Household Living', percentage: 20, color: '#0288D1' },
        { name: 'Marketing Ads', percentage: 10, color: '#6A1B9A' }
      ],
      monthlyIncome: 125000,
      monthlyExpenses: 87500,
      savingsRate: '30%',
      spendingPattern: 'High Margin Entrepreneur'
    },
    loanAmount: 100000,
    loanTenure: 24,
    loanInterestRate: 11.0,
    loanEmi: 4660,
    loanStatus: 'APPROVED'
  }
];

// In-Memory Fallback DB Store for Zero-Setup execution
export class MockDatabase {
  users: any[] = [];
  kycDocuments: any[] = [];
  loans: any[] = [];
  transactions: any[] = [];
  predictions: any[] = [];
  recommendations: any[] = [];
  alerts: any[] = [];
  chats: any[] = [];
  repayments: any[] = [];
  auditLogs: any[] = [];

  constructor() {
    console.log('SpendiFy Mock Database initialized with sample borrower profiles.');
    this.seedDefaults();
  }

  seedDefaults() {
    const adminHash = bcrypt.hashSync('Admin@123', 10);
    const officerHash = bcrypt.hashSync('Officer@123', 10);
    const borrowerHash = bcrypt.hashSync('Borrower@123', 10);

    // 1. Admin user
    this.users.push({
      id: 'admin-1',
      email: 'admin@spendify.com',
      passwordHash: adminHash,
      name: 'System Admin',
      phone: '+919999999991',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 2. Loan Officer
    this.users.push({
      id: 'officer-1',
      email: 'officer@spendify.com',
      passwordHash: officerHash,
      name: 'Senior Loan Officer',
      phone: '+919999999992',
      role: 'OFFICER',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 3. Default demo borrower
    const demoBorrowerId = 'user-borrower';
    this.users.push({
      id: demoBorrowerId,
      email: 'borrower@spendify.com',
      passwordHash: borrowerHash,
      name: 'Aarav Sharma (Demo)',
      phone: '+919876543200',
      role: 'BORROWER',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.kycDocuments.push({
      id: `kyc-${demoBorrowerId}`,
      userId: demoBorrowerId,
      aadhaarNumber: '987654321000',
      panNumber: 'AARAV1234Z',
      aadhaarUrl: '/uploads/sample_aadhaar.pdf',
      panUrl: '/uploads/sample_pan.pdf',
      bankStatementUrl: '/uploads/sample_statement.pdf',
      esignatureUrl: '/uploads/sample_signature.png',
      status: 'APPROVED',
      verifiedAt: new Date(),
      verifierNotes: 'Verified via SpendiFy AI auto-underwriting engine.',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const demoLoanId = `loan-${demoBorrowerId}`;
    this.loans.push({
      id: demoLoanId,
      userId: demoBorrowerId,
      amount: 50000,
      tenureMonths: 12,
      interestRate: 12.5,
      emi: 4450,
      processingFee: 750,
      totalInterest: 3400,
      totalPayable: 54150,
      outstandingBalance: 41100,
      paidInstalments: 2,
      totalInstalments: 12,
      nextDueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
      status: 'APPROVED',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Generate repayment schedule for demo borrower
    for (let m = 1; m <= 12; m++) {
      const d = new Date();
      d.setMonth(d.getMonth() + (m - 2)); // 2 paid, 1 due soon, rest upcoming
      const isPaid = m <= 2;
      const isDueSoon = m === 3;
      this.repayments.push({
        id: `${demoLoanId}-inst-${m}`,
        loanId: demoLoanId,
        instalmentNumber: m,
        dueDate: d.toISOString(),
        emiAmount: 4450,
        principalComponent: 3950,
        interestComponent: 500,
        openingBalance: 50000 - ((m - 1) * 3950),
        closingBalance: Math.max(0, 50000 - (m * 3950)),
        status: isPaid ? 'PAID' : (isDueSoon ? 'DUE_SOON' : 'UPCOMING'),
        paidAt: isPaid ? new Date(d.getTime() - 86400000 * 2) : undefined,
        paymentMethod: isPaid ? 'SIMULATED_UPI' : undefined
      });
    }

    this.predictions.push({
      id: `pred-${demoBorrowerId}`,
      loanId: demoLoanId,
      creditScore: 785,
      financialHealth: 88.5,
      defaultProbability: 0.08,
      riskCategory: 'LOW',
      shapExplanation: {
        pay_0: -0.24,
        limit_bal: -0.18,
        pay_amt1: -0.15,
        bill_amt1: 0.08,
        age: -0.05
      },
      recommendationNote: 'AI Profile evaluated: Disciplined Saver & Low Credit Default Risk',
      createdAt: new Date()
    });

    // Populate 10 sample borrower profiles
    SAMPLE_PROFILES_DATA.forEach((prof) => {
      this.users.push({
        id: prof.id,
        email: prof.email,
        passwordHash: borrowerHash,
        name: prof.name,
        phone: prof.phone,
        role: prof.role,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      this.kycDocuments.push({
        id: `kyc-${prof.id}`,
        userId: prof.id,
        aadhaarNumber: prof.aadhaarNumber,
        panNumber: prof.panNumber,
        aadhaarUrl: '/uploads/sample_aadhaar.pdf',
        panUrl: '/uploads/sample_pan.pdf',
        bankStatementUrl: '/uploads/sample_statement.pdf',
        esignatureUrl: '/uploads/sample_signature.png',
        status: prof.kycStatus,
        verifiedAt: new Date(),
        verifierNotes: 'Verified via SpendiFy AI auto-underwriting engine.',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const loanId = `loan-${prof.id}`;
      this.loans.push({
        id: loanId,
        userId: prof.id,
        amount: prof.loanAmount,
        tenureMonths: prof.loanTenure,
        interestRate: prof.loanInterestRate,
        emi: prof.loanEmi,
        status: prof.loanStatus,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      this.predictions.push({
        id: `pred-${prof.id}`,
        loanId: loanId,
        creditScore: prof.creditScore,
        financialHealth: prof.financialHealth,
        defaultProbability: prof.defaultProbability,
        riskCategory: prof.riskCategory,
        shapExplanation: {
          occupation: prof.occupation,
          spendingHabits: prof.spendingHabits
        },
        recommendationNote: `AI Profile evaluated for ${prof.name}: ${prof.spendingHabits.spendingPattern}`,
        createdAt: new Date()
      });
    });
  }

  async connect() {
    return true;
  }
}

export const mockDb = new MockDatabase();

// Export a function to check if PostgreSQL is available
export async function checkDbConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('PostgreSQL/SQLite connection established successfully via Prisma.');
    return true;
  } catch (error) {
    console.warn('⚠️ Main database connection notice. Operating seamlessly using local memory database.');
    return false;
  }
}

export { prisma };

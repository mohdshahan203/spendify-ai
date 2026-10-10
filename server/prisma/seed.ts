import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const SAMPLE_PROFILES_DATA = [
  {
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
        { name: 'Design Hardware', percentage: 40, color: '#9C27B0' },
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
    loanStatus: 'APPROVED'
  },
  {
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

async function main() {
  console.log('Seeding database with 10 sample user profiles...');

  const passwordHash = await bcrypt.hash('Borrower@123', 10);
  const adminHash = await bcrypt.hash('Admin@123', 10);

  // 1. Seed Admin
  await prisma.user.upsert({
    where: { email: 'admin@spendify.com' },
    update: {},
    create: {
      email: 'admin@spendify.com',
      phone: '+919999999991',
      passwordHash: adminHash,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  // 2. Seed 10 Borrower Profiles
  for (const prof of SAMPLE_PROFILES_DATA) {
    const user = await prisma.user.upsert({
      where: { email: prof.email },
      update: { name: prof.name, phone: prof.phone },
      create: {
        email: prof.email,
        phone: prof.phone,
        passwordHash,
        name: prof.name,
        role: 'BORROWER'
      }
    });

    // KYC
    await prisma.kYCDocument.upsert({
      where: { userId: user.id },
      update: { status: prof.kycStatus },
      create: {
        userId: user.id,
        aadhaarNumber: prof.aadhaarNumber,
        panNumber: prof.panNumber,
        aadhaarUrl: '/uploads/sample_aadhaar.pdf',
        panUrl: '/uploads/sample_pan.pdf',
        bankStatementUrl: '/uploads/sample_statement.pdf',
        esignatureUrl: '/uploads/sample_signature.png',
        status: prof.kycStatus,
        verifiedAt: prof.kycStatus === 'APPROVED' ? new Date() : null,
        verifierNotes: 'Verified via SpendiFy AI auto-underwriting engine.'
      }
    });

    // Create loan application & AI prediction
    const loan = await prisma.loan.create({
      data: {
        userId: user.id,
        amount: prof.loanAmount,
        tenureMonths: prof.loanTenure,
        interestRate: prof.loanInterestRate,
        emi: prof.loanEmi,
        status: prof.loanStatus
      }
    });

    await prisma.aIPrediction.create({
      data: {
        loanId: loan.id,
        creditScore: prof.creditScore,
        financialHealth: prof.financialHealth,
        defaultProbability: prof.defaultProbability,
        riskCategory: prof.riskCategory,
        shapExplanation: JSON.stringify({
          occupation: prof.occupation,
          spendingHabits: prof.spendingHabits
        }),
        recommendationNote: `AI Profile evaluated for ${prof.name}: ${prof.spendingHabits.spendingPattern}`
      }
    });
  }

  console.log('✅ Successfully seeded 10 sample user profiles with spending habits & scores!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

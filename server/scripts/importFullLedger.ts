import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface LedgerCustomer {
  name: string;
  email: string;
  phone: string;
  creditScore: number;
  financialHealth: number;
  defaultProbability: number;
  riskCategory: string;
  summaryNote: string;
  loans: {
    loanCode: string;
    amount: number;
    interestRate: number; // monthly interest as percentage or flat
    monthlyInterestAmount: number;
    status: string; // APPROVED, PENDING, DEFAULTED
    createdAt: Date;
    transactions: {
      date: Date;
      amount: number;
      status: string; // SUCCESS, PENDING
    }[];
  }[];
}

const LEDGER_CUSTOMERS: LedgerCustomer[] = [
  {
    name: 'Abhishek',
    email: 'abhishek.ledger@spendify.com',
    phone: '+919111111001',
    creditScore: 765,
    financialHealth: 96.4,
    defaultProbability: 0.055,
    riskCategory: 'LOW',
    summaryNote: 'Disciplined borrower with 100% on-time repayment history across 2 active loans.',
    loans: [
      {
        loanCode: 'AB001',
        amount: 10000,
        interestRate: 12.0,
        monthlyInterestAmount: 1000,
        status: 'APPROVED',
        createdAt: new Date('2026-01-05'),
        transactions: [
          { date: new Date('2026-01-10'), amount: 1000, status: 'SUCCESS' },
          { date: new Date('2026-02-10'), amount: 1000, status: 'SUCCESS' },
          { date: new Date('2026-03-10'), amount: 1000, status: 'SUCCESS' },
          { date: new Date('2026-04-10'), amount: 1000, status: 'SUCCESS' },
        ],
      },
      {
        loanCode: 'AB002',
        amount: 5000,
        interestRate: 12.0,
        monthlyInterestAmount: 500,
        status: 'APPROVED',
        createdAt: new Date('2026-03-15'),
        transactions: [
          { date: new Date('2026-04-15'), amount: 500, status: 'SUCCESS' },
        ],
      },
    ],
  },
  {
    name: 'Appu',
    email: 'appu.ledger@spendify.com',
    phone: '+919111111002',
    creditScore: 640,
    financialHealth: 51.7,
    defaultProbability: 0.201,
    riskCategory: 'MEDIUM',
    summaryNote: 'Moderate repayment profile with 1 pending April interest payment.',
    loans: [
      {
        loanCode: 'AP001',
        amount: 6000,
        interestRate: 12.0,
        monthlyInterestAmount: 600,
        status: 'PENDING',
        createdAt: new Date('2026-01-08'),
        transactions: [
          { date: new Date('2026-02-08'), amount: 600, status: 'SUCCESS' },
          { date: new Date('2026-03-08'), amount: 600, status: 'SUCCESS' },
          { date: new Date('2026-04-08'), amount: 600, status: 'PENDING' },
        ],
      },
    ],
  },
  {
    name: 'Naresh',
    email: 'naresh.ledger@spendify.com',
    phone: '+919111111003',
    creditScore: 645,
    financialHealth: 53.0,
    defaultProbability: 0.192,
    riskCategory: 'MEDIUM',
    summaryNote: 'Self-employed borrower with 67% on-time payment rate; April EMI pending.',
    loans: [
      {
        loanCode: 'NA001',
        amount: 15000,
        interestRate: 12.0,
        monthlyInterestAmount: 1500,
        status: 'PENDING',
        createdAt: new Date('2026-01-10'),
        transactions: [
          { date: new Date('2026-02-10'), amount: 1500, status: 'SUCCESS' },
          { date: new Date('2026-03-10'), amount: 1500, status: 'SUCCESS' },
          { date: new Date('2026-04-10'), amount: 1500, status: 'PENDING' },
        ],
      },
    ],
  },
  {
    name: 'Shishir',
    email: 'shishir.ledger@spendify.com',
    phone: '+919111111004',
    creditScore: 758,
    financialHealth: 95.5,
    defaultProbability: 0.061,
    riskCategory: 'LOW',
    summaryNote: 'Excellent repayment record with low debt utilization.',
    loans: [
      {
        loanCode: 'SH001',
        amount: 8000,
        interestRate: 12.0,
        monthlyInterestAmount: 800,
        status: 'APPROVED',
        createdAt: new Date('2026-01-15'),
        transactions: [
          { date: new Date('2026-02-15'), amount: 800, status: 'SUCCESS' },
          { date: new Date('2026-03-15'), amount: 800, status: 'SUCCESS' },
          { date: new Date('2026-04-15'), amount: 800, status: 'SUCCESS' },
        ],
      },
    ],
  },
  {
    name: 'Santosh',
    email: 'santosh.ledger@spendify.com',
    phone: '+919111111005',
    creditScore: 520,
    financialHealth: 34.6,
    defaultProbability: 0.624,
    riskCategory: 'HIGH',
    summaryNote: 'High risk borrower with 2 consecutive overdue interest payments (Feb & Mar).',
    loans: [
      {
        loanCode: 'SA001',
        amount: 12000,
        interestRate: 12.0,
        monthlyInterestAmount: 1200,
        status: 'PENDING',
        createdAt: new Date('2026-01-18'),
        transactions: [
          { date: new Date('2026-02-18'), amount: 1200, status: 'PENDING' },
          { date: new Date('2026-03-18'), amount: 1200, status: 'PENDING' },
        ],
      },
    ],
  },
  {
    name: 'Aditya',
    email: 'aditya.ledger@spendify.com',
    phone: '+919111111006',
    creditScore: 745,
    financialHealth: 91.9,
    defaultProbability: 0.072,
    riskCategory: 'LOW',
    summaryNote: 'Reliable borrower with 100% prompt interest payments.',
    loans: [
      {
        loanCode: 'AD001',
        amount: 5000,
        interestRate: 12.0,
        monthlyInterestAmount: 500,
        status: 'APPROVED',
        createdAt: new Date('2026-01-20'),
        transactions: [
          { date: new Date('2026-02-20'), amount: 500, status: 'SUCCESS' },
          { date: new Date('2026-03-20'), amount: 500, status: 'SUCCESS' },
          { date: new Date('2026-04-20'), amount: 500, status: 'SUCCESS' },
        ],
      },
    ],
  },
  {
    name: 'Gundu',
    email: 'gundu.ledger@spendify.com',
    phone: '+919111111007',
    creditScore: 782,
    financialHealth: 97.8,
    defaultProbability: 0.042,
    riskCategory: 'LOW',
    summaryNote: 'Top-tier merchant borrower with perfect track record across 2 active loans.',
    loans: [
      {
        loanCode: 'GU001',
        amount: 20000,
        interestRate: 12.0,
        monthlyInterestAmount: 2000,
        status: 'APPROVED',
        createdAt: new Date('2026-01-22'),
        transactions: [
          { date: new Date('2026-02-22'), amount: 2000, status: 'SUCCESS' },
          { date: new Date('2026-03-22'), amount: 2000, status: 'SUCCESS' },
          { date: new Date('2026-04-22'), amount: 2000, status: 'SUCCESS' },
        ],
      },
      {
        loanCode: 'GU002',
        amount: 8000,
        interestRate: 12.0,
        monthlyInterestAmount: 800,
        status: 'APPROVED',
        createdAt: new Date('2026-04-10'),
        transactions: [
          { date: new Date('2026-04-10'), amount: 800, status: 'SUCCESS' },
        ],
      },
    ],
  },
  {
    name: 'Shrishail',
    email: 'shrishail.ledger@spendify.com',
    phone: '+919111111008',
    creditScore: 610,
    financialHealth: 47.6,
    defaultProbability: 0.248,
    riskCategory: 'MEDIUM',
    summaryNote: '50% payment record; March interest payment pending.',
    loans: [
      {
        loanCode: 'SR001',
        amount: 7000,
        interestRate: 12.0,
        monthlyInterestAmount: 700,
        status: 'PENDING',
        createdAt: new Date('2026-01-25'),
        transactions: [
          { date: new Date('2026-02-25'), amount: 700, status: 'SUCCESS' },
          { date: new Date('2026-03-25'), amount: 700, status: 'PENDING' },
        ],
      },
    ],
  },
  {
    name: 'Omkar',
    email: 'omkar.ledger@spendify.com',
    phone: '+919111111009',
    creditScore: 650,
    financialHealth: 56.7,
    defaultProbability: 0.185,
    riskCategory: 'MEDIUM',
    summaryNote: 'Paid Feb & Mar; April interest payment pending.',
    loans: [
      {
        loanCode: 'OM001',
        amount: 10000,
        interestRate: 12.0,
        monthlyInterestAmount: 1000,
        status: 'PENDING',
        createdAt: new Date('2026-01-28'),
        transactions: [
          { date: new Date('2026-02-28'), amount: 1000, status: 'SUCCESS' },
          { date: new Date('2026-03-28'), amount: 1000, status: 'SUCCESS' },
          { date: new Date('2026-04-28'), amount: 1000, status: 'PENDING' },
        ],
      },
    ],
  },
  {
    name: 'Karthik',
    email: 'karthik.ledger@spendify.com',
    phone: '+919111111010',
    creditScore: 770,
    financialHealth: 96.8,
    defaultProbability: 0.050,
    riskCategory: 'LOW',
    summaryNote: 'Consistent low-risk borrower with 100% prompt repayments.',
    loans: [
      {
        loanCode: 'KA001',
        amount: 9000,
        interestRate: 12.0,
        monthlyInterestAmount: 900,
        status: 'APPROVED',
        createdAt: new Date('2026-01-30'),
        transactions: [
          { date: new Date('2026-02-28'), amount: 900, status: 'SUCCESS' },
          { date: new Date('2026-03-30'), amount: 900, status: 'SUCCESS' },
          { date: new Date('2026-04-30'), amount: 900, status: 'SUCCESS' },
        ],
      },
    ],
  },
  {
    name: 'Rakesh',
    email: 'rakesh.ledger@spendify.com',
    phone: '+919111111011',
    creditScore: 710,
    financialHealth: 73.0,
    defaultProbability: 0.104,
    riskCategory: 'LOW',
    summaryNote: 'May-disbursed loan with 100% on-time payments through August.',
    loans: [
      {
        loanCode: 'RK001',
        amount: 7000,
        interestRate: 12.0,
        monthlyInterestAmount: 700,
        status: 'APPROVED',
        createdAt: new Date('2026-05-03'),
        transactions: [
          { date: new Date('2026-06-03'), amount: 700, status: 'SUCCESS' },
          { date: new Date('2026-07-03'), amount: 700, status: 'SUCCESS' },
          { date: new Date('2026-08-03'), amount: 700, status: 'SUCCESS' },
        ],
      },
    ],
  },
  {
    name: 'Manoj',
    email: 'manoj.ledger@spendify.com',
    phone: '+919111111012',
    creditScore: 505,
    financialHealth: 31.5,
    defaultProbability: 0.681,
    riskCategory: 'HIGH',
    summaryNote: 'High risk profile with consecutive overdue July & August EMIs.',
    loans: [
      {
        loanCode: 'MJ001',
        amount: 12000,
        interestRate: 12.0,
        monthlyInterestAmount: 1200,
        status: 'PENDING',
        createdAt: new Date('2026-06-12'),
        transactions: [
          { date: new Date('2026-07-12'), amount: 1200, status: 'PENDING' },
          { date: new Date('2026-08-12'), amount: 1200, status: 'PENDING' },
        ],
      },
    ],
  },
  {
    name: 'Suresh',
    email: 'suresh.ledger@spendify.com',
    phone: '+919111111013',
    creditScore: 730,
    financialHealth: 88.2,
    defaultProbability: 0.088,
    riskCategory: 'LOW',
    summaryNote: 'July-disbursed loan with August interest paid on time.',
    loans: [
      {
        loanCode: 'SU001',
        amount: 5000,
        interestRate: 12.0,
        monthlyInterestAmount: 500,
        status: 'APPROVED',
        createdAt: new Date('2026-07-18'),
        transactions: [
          { date: new Date('2026-08-18'), amount: 500, status: 'SUCCESS' },
        ],
      },
    ],
  },
];

async function main() {
  console.log('🚀 Importing 13 Offline Customers from Ledger with exact Scores, Loans, and Repayment Transactions...');

  const passwordHash = await bcrypt.hash('Borrower@123', 10);
  let userCount = 0;
  let loanCount = 0;
  let txCount = 0;

  for (const c of LEDGER_CUSTOMERS) {
    // 1. Find or create User
    let user = await prisma.user.findFirst({
      where: { OR: [{ email: c.email }, { phone: c.phone }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: c.email,
          phone: c.phone,
          passwordHash,
          name: c.name,
          role: 'BORROWER',
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: c.name },
      });
    }
    userCount++;

    // 2. KYC Document
    await prisma.kYCDocument.upsert({
      where: { userId: user.id },
      update: { status: 'APPROVED' },
      create: {
        userId: user.id,
        aadhaarNumber: `999888${String(userCount).padStart(6, '0')}`,
        panNumber: `LDGR${String(userCount).padStart(5, '0')}P`,
        status: 'APPROVED',
        verifiedAt: new Date(),
        verifierNotes: 'Verified via Ledger Import.',
      },
    });

    // 3. Create Loans and Transactions
    for (const l of c.loans) {
      const loan = await prisma.loan.create({
        data: {
          userId: user.id,
          amount: l.amount,
          tenureMonths: 12,
          interestRate: l.interestRate,
          emi: l.monthlyInterestAmount,
          status: l.status,
          createdAt: l.createdAt,
        },
      });
      loanCount++;

      // Create AIPrediction for this loan
      await prisma.aIPrediction.create({
        data: {
          loanId: loan.id,
          creditScore: c.creditScore,
          financialHealth: c.financialHealth,
          defaultProbability: c.defaultProbability,
          riskCategory: c.riskCategory,
          shapExplanation: JSON.stringify({
            source: 'Offline Customer Ledger',
            loanCode: l.loanCode,
            principal: l.amount,
            monthlyInterest: l.monthlyInterestAmount,
          }),
          recommendationNote: c.summaryNote,
        },
      });

      // Create Individual Repayment Transactions
      for (const t of l.transactions) {
        await prisma.transaction.create({
          data: {
            loanId: loan.id,
            amount: t.amount,
            type: 'EMI_PAYMENT',
            status: t.status,
            createdAt: t.date,
          },
        });
        txCount++;
      }
    }
  }

  console.log(`\n✅ Successfully imported:`);
  console.log(`   - ${userCount} Users`);
  console.log(`   - ${loanCount} Loans`);
  console.log(`   - ${txCount} Repayment Transactions`);
  console.log(`All AI Credit Scores, Risk Categories, and Ledger Histories are live in the database!`);
}

main()
  .catch((e) => {
    console.error('❌ Error during importFullLedger:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

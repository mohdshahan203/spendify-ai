import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface CSVRow {
  name: string;
  email: string;
  phone: string;
  age: number;
  employment_type: string;
  employment_length_months: number;
  annual_income: number;
  monthly_income: number;
  monthly_expenses: number;
  total_debt: number;
  savings_balance: number;
  credit_utilization: number;
  num_credit_cards: number;
  num_active_loans: number;
  payment_history_score: number;
  years_of_credit_history: number;
  num_hard_inquiries: number;
  bankruptcies: number;
  tax_liens: number;
  dependents: number;
  requested_loan_amount: number;
  requested_tenure_months: number;
  interest_rate: number;
  is_default: number;
  risk_category: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function importOfflineCustomers() {
  const csvArg = process.argv[2];
  const defaultPath = path.join(__dirname, '../../data/sample_offline_customers.csv');
  const csvPath = csvArg ? path.resolve(csvArg) : defaultPath;

  console.log(`🚀 Starting Offline Customer Data Import from: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV File not found at path: ${csvPath}`);
  }

  const rawData = fs.readFileSync(csvPath, 'utf-8');
  const lines = rawData.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length <= 1) {
    console.log('⚠️ CSV file is empty or missing data rows.');
    return;
  }

  const headers = parseCSVLine(lines[0]);
  console.log(`📋 Found headers: ${headers.join(', ')}`);

  const passwordHash = await bcrypt.hash('Borrower@123', 10);
  let importedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });

    const email = row.email || `customer_${i}@offline.com`;
    const name = row.name || `Offline Customer ${i}`;
    const phone = row.phone || `+919876543${String(i).padStart(3, '0')}`;
    const isDefault = parseInt(row.is_default || '0', 10);
    const riskCategory = row.risk_category || (isDefault ? 'HIGH' : 'LOW');
    const loanAmount = parseFloat(row.requested_loan_amount || '100000');
    const tenureMonths = parseInt(row.requested_tenure_months || '12', 10);
    const interestRate = parseFloat(row.interest_rate || '12.5');

    // Simple EMI formula
    const monthlyRate = interestRate / 12 / 100;
    const emi = Math.round(
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1)
    );

    // Estimate credit score from financial values
    const paymentScore = parseFloat(row.payment_history_score || '0.9');
    const creditScore = Math.min(
      900,
      Math.max(300, Math.round(300 + paymentScore * 500 - isDefault * 150))
    );
    const financialHealth = Math.round(paymentScore * 90 - (isDefault ? 30 : 0));

    // 1. Upsert User safely
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          name,
          role: 'BORROWER',
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    // 2. Upsert KYC Document
    await prisma.kYCDocument.upsert({
      where: { userId: user.id },
      update: { status: 'APPROVED' },
      create: {
        userId: user.id,
        aadhaarNumber: `999000${String(i).padStart(6, '0')}`,
        panNumber: `OFFLN${String(i).padStart(4, '0')}P`,
        status: 'APPROVED',
        verifiedAt: new Date(),
        verifierNotes: 'Imported from offline startup records.',
      },
    });

    // 3. Create Loan Record
    const loanStatus = isDefault ? 'DEFAULTED' : 'APPROVED';
    const loan = await prisma.loan.create({
      data: {
        userId: user.id,
        amount: loanAmount,
        tenureMonths,
        interestRate,
        emi,
        status: loanStatus,
      },
    });

    // 4. Create AI Prediction Record
    await prisma.aIPrediction.create({
      data: {
        loanId: loan.id,
        creditScore,
        financialHealth,
        defaultProbability: isDefault ? 0.85 : 0.08,
        riskCategory,
        shapExplanation: JSON.stringify({
          source: 'Offline Import',
          employment_type: row.employment_type || 'salaried',
          monthly_income: parseFloat(row.monthly_income || '50000'),
          monthly_expenses: parseFloat(row.monthly_expenses || '20000'),
          total_debt: parseFloat(row.total_debt || '50000'),
          savings_balance: parseFloat(row.savings_balance || '100000'),
        }),
        recommendationNote: `Imported offline customer record (Default Status: ${isDefault ? 'Defaulted' : 'Repaid'}).`,
      },
    });

    importedCount++;
  }

  console.log(`\n✅ Successfully imported ${importedCount} offline customer records into the database!`);
}

importOfflineCustomers()
  .catch((e) => {
    console.error('❌ Error during offline data import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

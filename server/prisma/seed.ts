import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with default users...');

  // Hash passwords
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const officerHash = await bcrypt.hash('Officer@123', 10);
  const borrowerHash = await bcrypt.hash('Borrower@123', 10);

  // Upsert Admin
  const admin = await prisma.user.upsert({
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
  console.log('Admin seeded:', admin.email);

  // Upsert Officer
  const officer = await prisma.user.upsert({
    where: { email: 'officer@spendify.com' },
    update: {},
    create: {
      email: 'officer@spendify.com',
      phone: '+919999999992',
      passwordHash: officerHash,
      name: 'Credit Officer',
      role: 'OFFICER',
    },
  });
  console.log('Loan Officer seeded:', officer.email);

  // Upsert Borrower
  const borrower = await prisma.user.upsert({
    where: { email: 'borrower@spendify.com' },
    update: {},
    create: {
      email: 'borrower@spendify.com',
      phone: '+918281342964',
      passwordHash: borrowerHash,
      name: 'Muhammad Shahan',
      role: 'BORROWER',
    },
  });
  console.log('Borrower seeded:', borrower.email);

  // Seed default KYC document for the borrower so they start in PENDING or APPROVED state (we will seed as APPROVED so they can test loan applications)
  const kyc = await prisma.kYCDocument.upsert({
    where: { userId: borrower.id },
    update: {},
    create: {
      userId: borrower.id,
      aadhaarNumber: '123456789012',
      aadhaarUrl: '/uploads/aadhaarFile-1784019175962-974019115.pdf',
      panNumber: 'ABCDE1234F',
      panUrl: '/uploads/panFile-1784019175987-227145603.pdf',
      bankStatementUrl: '/uploads/bankStatementFile-1784019176010-981396224.pdf',
      esignatureUrl: '/uploads/esignatureFile-1784019176015-782143120.jpeg',
      status: 'APPROVED',
      verifiedAt: new Date(),
      verifierNotes: 'Verified automatically via seed.',
    },
  });
  console.log('Borrower KYC seeded:', kyc.status);

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

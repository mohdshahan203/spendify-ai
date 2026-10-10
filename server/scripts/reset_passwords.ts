import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RESETTING ALL USER PASSWORDS IN DATABASE ---');

  const adminHash = await bcrypt.hash('Admin@123', 10);
  const borrowerHash = await bcrypt.hash('Borrower@123', 10);

  // 1. Admin account
  await prisma.user.upsert({
    where: { email: 'admin@spendify.com' },
    update: { passwordHash: adminHash, role: 'ADMIN' },
    create: {
      email: 'admin@spendify.com',
      phone: '+919999999991',
      passwordHash: adminHash,
      name: 'System Admin',
      role: 'ADMIN'
    }
  });
  console.log('✅ Updated admin@spendify.com password -> Admin@123');

  // 2. All other users -> Borrower@123
  const count = await prisma.user.updateMany({
    where: {
      email: { not: 'admin@spendify.com' }
    },
    data: {
      passwordHash: borrowerHash
    }
  });
  console.log(`✅ Updated ${count.count} user accounts password -> Borrower@123`);

  // Verify compare
  const admin = await prisma.user.findUnique({ where: { email: 'admin@spendify.com' } });
  const adminValid = await bcrypt.compare('Admin@123', admin!.passwordHash);
  console.log(`- Admin Password Verification: ${adminValid ? 'SUCCESS ✅' : 'FAILED ❌'}`);

  const sample = await prisma.user.findFirst({ where: { email: { not: 'admin@spendify.com' } } });
  if (sample) {
    const borrowerValid = await bcrypt.compare('Borrower@123', sample.passwordHash);
    console.log(`- Borrower (${sample.email}) Password Verification: ${borrowerValid ? 'SUCCESS ✅' : 'FAILED ❌'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

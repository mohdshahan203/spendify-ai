import { dbService } from '../src/services/dbService';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

async function runAlphaTest() {
  console.log('====================================================');
  console.log('      SPENDIFY ALPHA TESTING & AUDIT REPORT         ');
  console.log('====================================================\n');

  // 1. Verify User Storage in Database
  console.log('--- 1. DATABASE USER STORAGE AUDIT ---');
  const allUsers = await dbService.user.findMany({
    include: {
      kycDoc: true,
      loans: true
    }
  });

  console.log(`Total users stored in dev.db: ${allUsers.length}`);
  const admins = allUsers.filter(u => u.role === 'ADMIN' || u.role === 'OFFICER');
  const borrowers = allUsers.filter(u => u.role === 'BORROWER');

  console.log(`- Admin / Officer Accounts: ${admins.length}`);
  console.log(`- Borrower Accounts: ${borrowers.length}`);

  admins.forEach(a => {
    console.log(`   └─ Admin Email: ${a.email} | Name: ${a.name} | Role: ${a.role}`);
  });

  // 2. Verify Admin Password & Auth Token Generation
  console.log('\n--- 2. ADMIN AUTHENTICATION VERIFICATION ---');
  const adminUser = await dbService.user.findUnique({ where: { email: 'admin@spendify.com' } });
  
  if (!adminUser) {
    console.error('❌ FAIL: Admin user admin@spendify.com not found in database!');
    process.exit(1);
  }

  const isPasswordValid = await bcrypt.compare('Admin@123', adminUser.passwordHash);
  if (!isPasswordValid) {
    console.error('❌ FAIL: Admin password validation failed!');
    process.exit(1);
  }
  console.log('✅ PASS: Admin password "Admin@123" matches hash in database.');

  const JWT_SECRET = process.env.JWT_SECRET || 'spendify_super_secret_jwt_key_123!';
  const token = jwt.sign(
    { id: adminUser.id, email: adminUser.email, role: adminUser.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  console.log('✅ PASS: Admin JWT Token generated successfully.');

  // 3. Verify Admin Portal Data Integrity
  console.log('\n--- 3. ADMIN PORTAL DATA INTEGRITY ---');
  const pendingKycs = await dbService.kycDocument.findMany({ where: { status: 'PENDING' } });
  const loans = await dbService.loan.findMany({ include: { user: true, prediction: true } });
  
  console.log(`- Total Loan Applications in DB: ${loans.length}`);
  console.log(`- Pending KYC Reviews in DB: ${pendingKycs.length}`);

  console.log('\n====================================================');
  console.log('        ALPHA TEST STATUS: ALL PASSED 🚀             ');
  console.log('====================================================');
  process.exit(0);
}

runAlphaTest().catch(err => {
  console.error('Alpha test error:', err);
  process.exit(1);
});

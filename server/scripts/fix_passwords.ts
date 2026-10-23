import { dbService } from '../src/services/dbService';
import bcrypt from 'bcrypt';

async function fixAndVerifyPasswords() {
  console.log('--- RE-HASHING AND VERIFYING ALL PASSWORDS ---');

  const adminHash = await bcrypt.hash('Admin@123', 10);
  const borrowerHash = await bcrypt.hash('Borrower@123', 10);

  let admin = await dbService.user.findUnique({ where: { email: 'admin@spendify.com' } });
  if (admin) {
    await dbService.user.update({
      where: { id: admin.id },
      data: {
        passwordHash: adminHash,
        role: 'ADMIN'
      }
    });
  } else {
    await dbService.user.create({
      data: {
        email: 'admin@spendify.com',
        phone: '+919999999991',
        passwordHash: adminHash,
        name: 'System Admin',
        role: 'ADMIN'
      }
    });
  }

  console.log('✅ Admin user reset: admin@spendify.com -> Admin@123');

  // 1b. Loan Officer account
  const officerHash = await bcrypt.hash('Officer@123', 10);
  let officer = await dbService.user.findUnique({ where: { email: 'officer@spendify.com' } });
  if (officer) {
    await dbService.user.update({
      where: { id: officer.id },
      data: {
        passwordHash: officerHash,
        role: 'OFFICER'
      }
    });
  } else {
    await dbService.user.create({
      data: {
        email: 'officer@spendify.com',
        phone: '+919999999992',
        passwordHash: officerHash,
        name: 'Loan Officer Rajesh',
        role: 'OFFICER'
      }
    });
  }
  console.log('✅ Loan Officer reset: officer@spendify.com -> Officer@123');

  // 2. Update all borrowers to Borrower@123
  const allUsers = await dbService.user.findMany();
  const borrowers = allUsers.filter((u: any) => u.role === 'BORROWER');

  for (const b of borrowers) {
    await dbService.user.update({
      where: { id: b.id },
      data: { passwordHash: borrowerHash }
    });
  }

  console.log(`✅ Reset password for ${borrowers.length} borrower accounts to Borrower@123`);

  // 3. Test bcrypt compare live
  const adminUser = await dbService.user.findUnique({ where: { email: 'admin@spendify.com' } });
  const checkAdmin = await bcrypt.compare('Admin@123', adminUser!.passwordHash);

  const allUsersAfterUpdate = await dbService.user.findMany();
  const sampleBorrower = allUsersAfterUpdate.find((u: any) => u.role === 'BORROWER');
  const checkBorrower = await bcrypt.compare('Borrower@123', sampleBorrower!.passwordHash);

  console.log(`- Admin Password Verification: ${checkAdmin ? 'SUCCESS ✅' : 'FAILED ❌'}`);
  console.log(`- Borrower Password Verification (${sampleBorrower?.email}): ${checkBorrower ? 'SUCCESS ✅' : 'FAILED ❌'}`);

  process.exit(0);
}

fixAndVerifyPasswords().catch(err => {
  console.error(err);
  process.exit(1);
});

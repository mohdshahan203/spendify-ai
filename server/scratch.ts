import { dbService } from './src/services/dbService';

async function main() {
  const users = await dbService.user.findMany();
  const aarav = users.find((u: any) => u.email === 'aarav.sharma@spendify.com');
  
  if (!aarav) {
    console.log("Aarav not found!");
    return;
  }

  const approvedLoan = aarav.loans?.find((l: any) => l.status === 'APPROVED');
  if (approvedLoan) {
    await dbService.loan.update({
      where: { id: approvedLoan.id },
      data: { status: 'ACTIVE' }
    });
    console.log(`Updated loan ${approvedLoan.id} for Aarav to ACTIVE`);
  } else {
    console.log("No APPROVED loan found for Aarav.");
  }
}

main().catch(console.error);

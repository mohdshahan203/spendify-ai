import { Request, Response } from 'express';
import { dbService } from '../services/dbService';

export const getPendingKYCs = async (req: Request, res: Response) => {
  try {
    const documents = await dbService.kycDocument.findMany();
    const pendingDocs = documents.filter(d => d.status === 'PENDING');
    res.status(200).json(pendingDocs);
  } catch (error: any) {
    console.error('Get pending KYCs error:', error);
    res.status(500).json({ error: 'Failed to retrieve pending KYC documents.' });
  }
};

export const verifyKYC = async (req: Request, res: Response) => {
  try {
    const { userId, status, notes } = req.body; // status: APPROVED or REJECTED

    if (!userId || !status) {
      return res.status(400).json({ error: 'User ID and status are required.' });
    }

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED.' });
    }

    const updatedKyc = await dbService.kycDocument.update({
      where: { userId },
      data: {
        status,
        verifiedAt: new Date(),
        verifierNotes: notes || ''
      }
    });

    res.status(200).json({
      message: `KYC document has been ${status.toLowerCase()} successfully.`,
      kyc: updatedKyc
    });
  } catch (error: any) {
    console.error('Verify KYC error:', error);
    res.status(500).json({ error: 'Failed to update KYC status.' });
  }
};

export const getLoanRequests = async (req: Request, res: Response) => {
  try {
    const loans = await dbService.loan.findMany();
    res.status(200).json(loans);
  } catch (error: any) {
    console.error('Get loan requests error:', error);
    res.status(500).json({ error: 'Failed to retrieve loan applications.' });
  }
};

export const reviewLoan = async (req: Request, res: Response) => {
  try {
    const { loanId, status } = req.body; // status: APPROVED or REJECTED

    if (!loanId || !status) {
      return res.status(400).json({ error: 'Loan ID and status are required.' });
    }

    const updatedLoan = await dbService.loan.update({
      where: { id: loanId },
      data: { status }
    });

    // If approved, trigger simulated disburse transaction
    if (status === 'APPROVED') {
      await dbService.transaction.create({
        data: {
          loanId,
          amount: updatedLoan.amount,
          type: 'DISBURSEMENT',
          status: 'SUCCESS'
        }
      });
    }

    res.status(200).json({
      message: `Loan application ${status.toLowerCase()} successfully.`,
      loan: updatedLoan
    });
  } catch (error: any) {
    console.error('Review loan error:', error);
    res.status(500).json({ error: 'Failed to review loan application.' });
  }
};

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const loans = await dbService.loan.findMany();
    const users = await dbService.user.findMany();
    const borrowers = users.filter(u => u.role === 'BORROWER');

    const totalBorrowers = borrowers.length;
    const pendingLoans = loans.filter(l => l.status === 'PENDING').length;
    const activeLoans = loans.filter(l => l.status === 'ACTIVE').length;
    const approvedCount = loans.filter(l => l.status === 'APPROVED' || l.status === 'ACTIVE' || l.status === 'PAID').length;
    const rejectedCount = loans.filter(l => l.status === 'REJECTED' || l.status === 'DEFAULTED').length;

    // Financial calculations
    const activeVolume = loans
      .filter(l => l.status === 'ACTIVE')
      .reduce((sum, l) => sum + l.amount, 0);

    const totalVolume = loans
      .filter(l => l.status !== 'REJECTED')
      .reduce((sum, l) => sum + l.amount, 0);

    // AI Risk Distribution statistics
    const risks = loans.map(l => l.prediction?.riskCategory || 'MEDIUM');
    const riskDistribution = {
      LOW: risks.filter(r => r === 'LOW').length,
      MEDIUM: risks.filter(r => r === 'MEDIUM').length,
      HIGH: risks.filter(r => r === 'HIGH').length,
      CRITICAL: risks.filter(r => r === 'CRITICAL').length
    };

    res.status(200).json({
      totalBorrowers,
      loanStats: {
        totalRequests: loans.length,
        pending: pendingLoans,
        active: activeLoans,
        approved: approvedCount,
        rejected: rejectedCount,
        activeVolume,
        totalVolume
      },
      riskDistribution,
      highRiskBorrowers: loans
        .filter(l => l.prediction?.riskCategory === 'HIGH' || l.prediction?.riskCategory === 'CRITICAL')
        .map(l => ({
          loanId: l.id,
          borrowerName: l.user?.name || 'Borrower',
          amount: l.amount,
          risk: l.prediction?.riskCategory,
          defaultProbability: l.prediction?.defaultProbability,
          creditScore: l.prediction?.creditScore
        }))
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to aggregate analytics.' });
  }
};

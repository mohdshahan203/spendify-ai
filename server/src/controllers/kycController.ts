import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { dbService } from '../services/dbService';

export const uploadKYC = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { aadhaarNumber, panNumber } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | any;

    if (!files) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    // Get individual file paths
    const aadhaarUrl = files['aadhaarFile'] ? `/uploads/${files['aadhaarFile'][0].filename}` : undefined;
    const panUrl = files['panFile'] ? `/uploads/${files['panFile'][0].filename}` : undefined;
    const bankStatementUrl = files['bankStatementFile'] ? `/uploads/${files['bankStatementFile'][0].filename}` : undefined;
    const esignatureUrl = files['esignatureFile'] ? `/uploads/${files['esignatureFile'][0].filename}` : undefined;

    // Verify files were actually uploaded
    if (!bankStatementUrl) {
      return res.status(400).json({ error: 'Bank statement PDF upload is required.' });
    }
    if (!aadhaarUrl) {
      return res.status(400).json({ error: 'Aadhaar PDF upload is required.' });
    }
    if (!panUrl) {
      return res.status(400).json({ error: 'PAN PDF upload is required.' });
    }
    if (!esignatureUrl) {
      return res.status(400).json({ error: 'E-signature file upload is required.' });
    }

    // Upsert KYC details
    const kyc = await dbService.kycDocument.upsert({
      where: { userId },
      create: {
        aadhaarNumber: aadhaarNumber || '',
        aadhaarUrl,
        panNumber: panNumber || '',
        panUrl,
        bankStatementUrl,
        esignatureUrl,
        status: 'PENDING'
      },
      update: {
        aadhaarNumber: aadhaarNumber || undefined,
        aadhaarUrl: aadhaarUrl || undefined,
        panNumber: panNumber || undefined,
        panUrl: panUrl || undefined,
        bankStatementUrl: bankStatementUrl || undefined,
        esignatureUrl: esignatureUrl || undefined,
        status: 'PENDING',
        verifiedAt: null,
        verifierNotes: null
      }
    });

    res.status(200).json({
      message: 'KYC documents uploaded successfully. Pending verification.',
      kyc
    });
  } catch (error: any) {
    console.error('KYC Upload error:', error);
    res.status(500).json({ error: 'KYC upload failed: ' + error.message });
  }
};

export const getKYC = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const kyc = await dbService.kycDocument.findUnique({ where: { userId } });
    if (!kyc) {
      return res.status(404).json({ message: 'KYC not started.', status: 'NOT_STARTED' });
    }

    res.status(200).json(kyc);
  } catch (error: any) {
    console.error('Get KYC error:', error);
    res.status(500).json({ error: 'Failed to retrieve KYC details.' });
  }
};

import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as kycController from '../controllers/kycController';
import * as loanController from '../controllers/loanController';
import * as adminController from '../controllers/adminController';
import * as advisorController from '../controllers/advisorController';
import * as alertController from '../controllers/alertController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// --- AUTHENTICATION ROUTES ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);

// --- KYC ROUTE (Protected, Borrower only for upload) ---
router.post(
  '/kyc/upload',
  authenticateJWT,
  authorizeRoles('BORROWER'),
  upload.fields([
    { name: 'aadhaarFile', maxCount: 1 },
    { name: 'panFile', maxCount: 1 },
    { name: 'bankStatementFile', maxCount: 1 },
    { name: 'esignatureFile', maxCount: 1 }
  ]),
  kycController.uploadKYC
);
router.get('/kyc', authenticateJWT, kycController.getKYC);

// --- LOAN ROUTES (Protected) ---
router.post('/loans/apply', authenticateJWT, authorizeRoles('BORROWER'), loanController.applyForLoan);
router.get('/loans/history', authenticateJWT, authorizeRoles('BORROWER'), loanController.getLoanHistory);
router.post('/loans/pay-emi', authenticateJWT, authorizeRoles('BORROWER'), loanController.payEMI);

// --- ALERTS ROUTES (Protected, Borrower & Officer/Admin) ---
router.get('/alerts', authenticateJWT, alertController.getAlerts);
router.post('/alerts/resolve', authenticateJWT, alertController.resolveAlert);

// --- AI FINANCIAL ADVISOR (Chatbot) ---
router.get('/advisor/history', authenticateJWT, advisorController.getChatHistory);
router.post('/advisor/message', authenticateJWT, advisorController.sendMessage);

// --- ADMIN / LOAN OFFICER PORTAL ROUTES (Protected) ---
router.get(
  '/admin/pending-kyc',
  authenticateJWT,
  authorizeRoles('ADMIN', 'OFFICER'),
  adminController.getPendingKYCs
);
router.post(
  '/admin/verify-kyc',
  authenticateJWT,
  authorizeRoles('ADMIN', 'OFFICER'),
  adminController.verifyKYC
);
router.get(
  '/admin/loans',
  authenticateJWT,
  authorizeRoles('ADMIN', 'OFFICER'),
  adminController.getLoanRequests
);
router.post(
  '/admin/review-loan',
  authenticateJWT,
  authorizeRoles('ADMIN', 'OFFICER'),
  adminController.reviewLoan
);
router.get(
  '/admin/stats',
  authenticateJWT,
  authorizeRoles('ADMIN', 'OFFICER'),
  adminController.getAdminStats
);

export default router;

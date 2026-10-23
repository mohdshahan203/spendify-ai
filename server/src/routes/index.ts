import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as kycController from '../controllers/kycController';
import * as loanController from '../controllers/loanController';
import * as adminController from '../controllers/adminController';
import * as advisorController from '../controllers/advisorController';
import * as alertController from '../controllers/alertController';
import * as transactionController from '../controllers/transactionController';
import * as budgetController from '../controllers/budgetController';
import * as reportController from '../controllers/reportController';
import * as creditScoreController from '../controllers/creditScoreController';
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

// --- CREDIT SCORING & RECOMMENDATION ENGINE ROUTES (Protected) ---
router.get('/credit-score', authenticateJWT, creditScoreController.getCreditScore);
router.post('/credit-score/recalculate', authenticateJWT, creditScoreController.recalculateCreditScore);
router.get('/loans/recommendations', authenticateJWT, creditScoreController.getRecommendations);
router.get('/financial-insights', authenticateJWT, creditScoreController.getFinancialInsights);

// --- LOAN ROUTES (Protected) ---
router.post('/loans/calculate', loanController.calculateLoan);
router.post('/loans/affordability-suggestions', authenticateJWT, loanController.getAffordabilitySuggestions);
router.get('/loans/repayments', authenticateJWT, loanController.getRepayments);
router.post('/loans/apply', authenticateJWT, authorizeRoles('BORROWER'), loanController.applyForLoan);
router.get('/loans/history', authenticateJWT, authorizeRoles('BORROWER'), loanController.getLoanHistory);
router.post('/loans/pay-emi', authenticateJWT, authorizeRoles('BORROWER', 'OFFICER', 'ADMIN'), loanController.payEMI);

// Advanced Loan Calculator & Scenarios
router.post('/loans/compare', loanController.compareScenarios);
router.post('/loans/simulate-prepayment', loanController.simulateLoanPrepayment);
router.get('/loans/saved-scenarios', authenticateJWT, loanController.getSavedScenarios);
router.post('/loans/saved-scenarios', authenticateJWT, loanController.saveScenario);
router.delete('/loans/saved-scenarios/:id', authenticateJWT, loanController.deleteSavedScenario);
router.get('/loans/draft', authenticateJWT, loanController.getLoanDraft);
router.post('/loans/draft', authenticateJWT, loanController.saveLoanDraft);
router.delete('/loans/draft', authenticateJWT, loanController.deleteLoanDraft);

// --- TRANSACTIONS & EXPENSE TRACKER ROUTES (Protected) ---
router.get('/transactions', authenticateJWT, transactionController.getTransactions);
router.post('/transactions', authenticateJWT, transactionController.createTransaction);
router.put('/transactions/:id', authenticateJWT, transactionController.updateTransaction);
router.delete('/transactions/:id', authenticateJWT, transactionController.deleteTransaction);
router.get('/transactions/summary', authenticateJWT, transactionController.getTransactionSummary);
router.post('/transactions/import-csv', authenticateJWT, transactionController.importCsvTransactions);
router.get('/transactions/export-csv', authenticateJWT, transactionController.exportCsvTransactions);

// --- BUDGETS & SAVINGS GOALS (Protected) ---
router.get('/budgets', authenticateJWT, budgetController.getBudgets);
router.post('/budgets', authenticateJWT, budgetController.upsertBudget);
router.delete('/budgets/:id', authenticateJWT, budgetController.deleteBudget);
router.get('/savings-goals', authenticateJWT, budgetController.getSavingsGoals);
router.post('/savings-goals', authenticateJWT, budgetController.createSavingsGoal);
router.post('/savings-goals/:id/contribute', authenticateJWT, budgetController.contributeToGoal);
router.delete('/savings-goals/:id', authenticateJWT, budgetController.deleteSavingsGoal);

// --- ALERTS ROUTES (Protected, Borrower & Officer/Admin) ---
router.get('/alerts', authenticateJWT, alertController.getAlerts);
router.post('/alerts/resolve', authenticateJWT, alertController.resolveAlert);
router.post('/alerts/read-all', authenticateJWT, alertController.markAllAlertsRead);
router.delete('/alerts/:id', authenticateJWT, alertController.dismissAlert);

// --- REPORTS & EXPORTS ---
router.get('/reports/monthly-summary', authenticateJWT, reportController.getMonthlySummaryReport);
router.get('/reports/download-csv', authenticateJWT, reportController.downloadReportCsv);

// --- AI FINANCIAL ADVISOR (Chatbot) ---
router.get('/advisor/check', advisorController.checkAdvisorConfig);
router.get('/advisor/status', authenticateJWT, advisorController.getAdvisorStatus);
router.get('/advisor/history', authenticateJWT, advisorController.getChatHistory);
router.post('/advisor/message', authenticateJWT, advisorController.sendMessage);
router.post('/advisor/test-live', authenticateJWT, advisorController.testAdvisorLive);

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
router.get(
  '/admin/profiles',
  authenticateJWT,
  authorizeRoles('ADMIN', 'OFFICER'),
  adminController.getBorrowerProfiles
);

export default router;

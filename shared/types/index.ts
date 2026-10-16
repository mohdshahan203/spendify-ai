export type Role = 'BORROWER' | 'OFFICER' | 'ADMIN';

export type KYCStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type LoanStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'PAID' | 'DEFAULTED';

export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertLevel = 'GREEN' | 'YELLOW' | 'RED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'URGENT';

export type RepaymentStatus = 'UPCOMING' | 'DUE_SOON' | 'PAID' | 'OVERDUE';

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface KYCDocument {
  id: string;
  userId: string;
  aadhaarNumber?: string;
  aadhaarUrl?: string;
  panNumber?: string;
  panUrl?: string;
  bankStatementUrl?: string;
  esignatureUrl?: string;
  status: KYCStatus;
  verifiedAt?: string;
  verifierNotes?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface RepaymentScheduleItem {
  id: string;
  loanId: string;
  instalmentNumber: number;
  dueDate: string;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  openingBalance: number;
  closingBalance: number;
  status: RepaymentStatus;
  paidAt?: string;
  transactionId?: string;
  paymentMethod?: string;
}

export interface Loan {
  id: string;
  userId: string;
  amount: number;
  tenureMonths: number;
  interestRate: number;
  emi: number;
  processingFee?: number;
  totalInterest?: number;
  totalPayable?: number;
  outstandingBalance?: number;
  paidInstalments?: number;
  totalInstalments?: number;
  nextDueDate?: string;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
  prediction?: AIPrediction;
  recommendation?: LoanRecommendation;
  repayments?: RepaymentScheduleItem[];
  user?: User;
}

export interface Transaction {
  id: string;
  loanId: string;
  amount: number;
  type: 'DISBURSEMENT' | 'EMI_PAYMENT' | 'LATE_FEE';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  paymentMethod?: string;
  referenceId?: string;
  createdAt: string;
}

export interface AIPrediction {
  id: string;
  loanId: string;
  creditScore: number;
  financialHealth: number;
  defaultProbability: number;
  riskCategory: RiskCategory;
  shapExplanation: Record<string, number>;
  recommendationNote?: string;
  createdAt: string;
}

export interface LoanRecommendation {
  id: string;
  loanId: string;
  suggestedAmount: number;
  suggestedTenure: number;
  suggestedEmi: number;
  suggestedRate: number;
  rationale: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  userId: string;
  level: AlertLevel;
  severity?: AlertSeverity;
  title?: string;
  triggerType: string;
  description: string;
  explanation?: string;
  recommendedAction?: string;
  relevantAmount?: number;
  relevantDate?: string;
  resolved: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  isBot: boolean;
  isConfigNotice?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// --- LOAN CALCULATOR & AFFORDABILITY SCHEMAS ---

export interface LoanCalculationInput {
  amount: number;
  annualRate: number;
  tenureMonths: number;
  processingFeePercent?: number;
  flatProcessingFee?: number;
  additionalCharges?: number;
}

export interface LoanCalculationResult {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  monthlyRate: number;
  emi: number;
  totalInterest: number;
  totalRepayment: number;
  processingFee: number;
  totalPayable: number;
  schedule: RepaymentScheduleItem[];
}

export interface FinancialProfile {
  monthlyIncome: number;
  essentialExpenses: number;
  existingDebtEmis: number;
  savings: number;
  monthlySurplus: number;
  debtToIncomeRatio: number;
}

export interface LoanScenarioSuggestion {
  scenarioType: 'EXTENDED_TENURE' | 'SHORTER_TENURE' | 'REDUCED_PRINCIPAL' | 'IMPROVE_SAVINGS_FIRST' | 'REQUESTED_PLAN';
  title: string;
  amount: number;
  tenureMonths: number;
  interestRate: number;
  emi: number;
  totalInterest: number;
  totalPayable: number;
  projectedSurplus: number;
  debtToIncomeRatio: number;
  affordabilityStatus: 'COMFORTABLE' | 'MODERATE' | 'STRETCHED' | 'HIGH_RISK';
  rationale: string;
  recommendation: string;
}

// --- NEW FINTECH MICRO-FEATURE TYPES ---

export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'UPI' | 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'NET_BANKING';

export interface UserTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  subCategory?: string;
  description: string;
  paymentMethod: PaymentMethod;
  date: string;
  isRecurring?: boolean;
  isVerified?: boolean;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  month: string; // "YYYY-MM"
  category: string;
  limitAmount: number;
  spentAmount?: number;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedLoanScenario {
  id: string;
  userId: string;
  name: string;
  amount: number;
  annualRate: number;
  tenureMonths: number;
  emi: number;
  totalInterest: number;
  totalPayable: number;
  createdAt: string;
}

export interface PrepaymentSimulationInput {
  amount: number;
  annualRate: number;
  tenureMonths: number;
  extraMonthlyPayment?: number;
  oneTimePrepayment?: number;
  prepaymentMonth?: number;
}

export interface PrepaymentSimulationResult {
  originalEmi: number;
  originalTotalInterest: number;
  originalTenureMonths: number;
  newTenureMonths: number;
  tenureMonthsSaved: number;
  newTotalInterest: number;
  interestSaved: number;
  newTotalPayable: number;
  estimatedPayoffDate: string;
  originalPayoffDate: string;
}

export interface ScenarioComparisonResult {
  scenarioA: LoanCalculationResult & { title: string };
  scenarioB: LoanCalculationResult & { title: string };
  emiDifference: number;
  interestDifference: number;
  totalPayableDifference: number;
  summary: string;
}

export interface LoanDraft {
  id: string;
  userId: string;
  amount: number;
  tenureMonths: number;
  purpose: string;
  monthlyIncome?: number;
  employmentType?: string;
  notes?: string;
  updatedAt: string;
}

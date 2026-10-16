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

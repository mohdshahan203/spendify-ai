export type Role = 'BORROWER' | 'OFFICER' | 'ADMIN';

export type KYCStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type LoanStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'PAID' | 'DEFAULTED';

export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertLevel = 'GREEN' | 'YELLOW' | 'RED';

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

export interface Loan {
  id: string;
  userId: string;
  amount: number;
  tenureMonths: number;
  interestRate: number;
  emi: number;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
  prediction?: AIPrediction;
  recommendation?: LoanRecommendation;
  user?: User;
}

export interface Transaction {
  id: string;
  loanId: string;
  amount: number;
  type: 'DISBURSEMENT' | 'EMI_PAYMENT' | 'LATE_FEE';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
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
  triggerType: string;
  description: string;
  resolved: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  isBot: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

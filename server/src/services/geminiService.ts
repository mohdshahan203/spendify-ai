import '../config/env';
import { GoogleGenAI } from '@google/genai';

export interface UserFinancialContext {
  userName: string;
  kycStatus: string;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  monthlySurplus?: number;
  existingDebtEmis?: number;
  savings?: number;
  creditScore?: number;
  riskCategory?: string;
  defaultProbability?: number;
  financialHealthScore?: number;
  activeLoan?: {
    id: string;
    amount: number;
    tenureMonths: number;
    interestRate: number;
    emi: number;
    status: string;
    outstandingBalance?: number;
    paidInstalments?: number;
    totalInstalments?: number;
    nextDueDate?: string;
  } | null;
  allLoansSummary?: string;
  spendingBreakdown?: Array<{ name: string; percentage: number }>;
}

export interface GeminiResponse {
  success: boolean;
  reply?: string;
  modelUsed?: string;
  error?: string;
  code?: 'KEY_MISSING' | 'API_ERROR' | 'INVALID_REQUEST';
  setupInstructions?: string;
}

export class GeminiFinancialAdvisorService {
  private getApiKey(): string {
    return process.env.GEMINI_API_KEY || '';
  }

  private getModelName(): string {
    return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(
      key &&
      key.trim().length > 0 &&
      !key.includes('your_gemini_api_key') &&
      !key.includes('your_actual_key_here') &&
      !key.includes('PLACEHOLDER')
    );
  }

  public getStatus() {
    const configured = this.isConfigured();
    const key = this.getApiKey().trim();
    return {
      sdk: '@google/genai',
      model: this.getModelName(),
      configured,
      keyPresent: Boolean(key && !key.includes('your_gemini_api_key')),
      keyLength: configured ? key.length : 0,
      formatValid: configured ? (key.startsWith('AIza') || key.length > 20) : false
    };
  }

  /**
   * Real, non-mock smoke test against Gemini API using the official @google/genai SDK.
   * Reports live model connectivity and latency without logging or displaying the API key.
   */
  public async testConnection(): Promise<{
    success: boolean;
    reply?: string;
    model: string;
    latencyMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const model = this.getModelName();

    if (!this.isConfigured()) {
      return {
        success: false,
        model,
        latencyMs: 0,
        error: 'GEMINI_API_KEY is not configured or is a placeholder in server/.env.'
      };
    }

    try {
      const apiKey = this.getApiKey();
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: 'Ping: Reply with "Spendify Gemini connection verified."'
      });

      const reply = response.text ? response.text.trim() : '';
      const latencyMs = Date.now() - startTime;

      if (!reply) {
        return {
          success: false,
          model,
          latencyMs,
          error: 'Received empty response from Gemini API.'
        };
      }

      return {
        success: true,
        reply,
        model,
        latencyMs
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const rawMsg = error?.message || String(error);
      const sanitized = rawMsg.replace(/key=AIza[0-9A-Za-z-_]+/gi, 'key=[REDACTED]');
      return {
        success: false,
        model,
        latencyMs,
        error: sanitized
      };
    }
  }

  public async askAdvisor(
    message: string,
    context: UserFinancialContext,
    conversationHistory: Array<{ role: 'user' | 'model'; content: string }> = []
  ): Promise<GeminiResponse> {
    const apiKey = this.getApiKey();

    if (!this.isConfigured()) {
      return {
        success: false,
        code: 'KEY_MISSING',
        error: 'Gemini API key is not configured on the server.',
        setupInstructions:
          'To activate the live Gemini AI Financial Assistant, obtain an API key from Google AI Studio (https://aistudio.google.com/) and add GEMINI_API_KEY=your_key to your server/.env file, then restart the server.'
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = this.getModelName();

      // Build system prompt with factual deterministic context
      const systemInstruction = this.buildSystemPrompt(context);

      // Format previous turns for context
      const contents: any[] = [];
      
      // Add system context as developer/system instruction or leading context
      contents.push({
        role: 'user',
        parts: [{ text: `[SYSTEM_FINANCIAL_CONTEXT]\n${systemInstruction}\n[END_SYSTEM_CONTEXT]` }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: `Understood. I am SpendiFy's AI Financial Advisor. I will use ${context.userName}'s verified financial figures, offer objective financial health analysis, explain risk assessments, calculate repayment impacts deterministically, and guide responsible borrowing without making binding credit decisions.` }]
      });

      // Add recent chat history (up to last 6 messages to stay concise)
      const recentHistory = conversationHistory.slice(-6);
      for (const turn of recentHistory) {
        contents.push({
          role: turn.role,
          parts: [{ text: turn.content }]
        });
      }

      // Add current user message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          temperature: 0.3, // Lower temperature to prevent hallucination of numbers
          maxOutputTokens: 1000
        }
      });

      const replyText = response.text ? response.text.trim() : '';

      if (!replyText) {
        return {
          success: false,
          code: 'API_ERROR',
          error: 'Gemini returned an empty response. Please try rephrasing your question.'
        };
      }

      return {
        success: true,
        reply: replyText,
        modelUsed: model
      };
    } catch (error: any) {
      const rawMsg = error?.message || String(error);
      const sanitized = rawMsg.replace(/key=AIza[0-9A-Za-z-_]+/gi, 'key=[REDACTED]');
      console.error('Gemini API execution error:', sanitized);
      return {
        success: false,
        code: 'API_ERROR',
        error: sanitized || 'Failed to communicate with Google Gemini API.',
        setupInstructions:
          'Ensure your GEMINI_API_KEY has valid permissions and available quota in Google AI Studio.'
      };
    }
  }

  private buildSystemPrompt(ctx: UserFinancialContext): string {
    const incomeStr = ctx.monthlyIncome ? `₹${ctx.monthlyIncome.toLocaleString('en-IN')}` : 'Not provided';
    const expensesStr = ctx.monthlyExpenses ? `₹${ctx.monthlyExpenses.toLocaleString('en-IN')}` : 'Not provided';
    const surplusStr = ctx.monthlySurplus !== undefined ? `₹${ctx.monthlySurplus.toLocaleString('en-IN')}` : 'Not calculated';
    const debtStr = ctx.existingDebtEmis ? `₹${ctx.existingDebtEmis.toLocaleString('en-IN')}` : '₹0';
    const savingsStr = ctx.savings ? `₹${ctx.savings.toLocaleString('en-IN')}` : 'Not provided';

    let loanDetails = 'None currently active.';
    if (ctx.activeLoan) {
      loanDetails = `
- Loan Reference: ${ctx.activeLoan.id}
- Principal Amount: ₹${ctx.activeLoan.amount.toLocaleString('en-IN')}
- Tenure: ${ctx.activeLoan.tenureMonths} months @ ${ctx.activeLoan.interestRate}% p.a.
- Monthly EMI: ₹${ctx.activeLoan.emi.toLocaleString('en-IN')}
- Status: ${ctx.activeLoan.status}
- Outstanding Balance: ₹${(ctx.activeLoan.outstandingBalance || 0).toLocaleString('en-IN')}
- Instalments: ${ctx.activeLoan.paidInstalments || 0} of ${ctx.activeLoan.totalInstalments || ctx.activeLoan.tenureMonths} paid
- Next Due Date: ${ctx.activeLoan.nextDueDate || 'None scheduled'}
      `.trim();
    }

    const spendingCategories = ctx.spendingBreakdown && ctx.spendingBreakdown.length > 0
      ? ctx.spendingBreakdown.map(c => `${c.name}: ${c.percentage}%`).join(', ')
      : 'Standard household distribution';

    return `
You are the SpendiFy AI Financial Assistant, embedded in an intelligent micro-lending platform.
The authenticated borrower is: ${ctx.userName}.

FACTUAL FINANCIAL PROFILE:
- KYC Verification Status: ${ctx.kycStatus}
- Verified Monthly Income: ${incomeStr}
- Essential Monthly Living Expenses: ${expensesStr}
- Existing Monthly Debt / EMI Commitments: ${debtStr}
- Deterministic Available Monthly Surplus: ${surplusStr}
- Liquid Emergency Savings: ${savingsStr}
- Spending Breakdown: ${spendingCategories}
- Credit Score: ${ctx.creditScore ? `${ctx.creditScore} / 900` : 'Not yet assessed / Insufficient Telemetry'}
- Risk Assessment Tier: ${ctx.riskCategory || 'UNASSESSED'}
- Estimated Default Probability: ${ctx.defaultProbability ? (ctx.defaultProbability * 100).toFixed(1) + '%' : 'N/A'}
- Financial Health Score: ${ctx.financialHealthScore || 75}/100
- Active Loans: ${loanDetails}
${ctx.allLoansSummary ? `- Historical Loans: ${ctx.allLoansSummary}` : ''}

OPERATING MANDATES & ETHICAL BOUNDARIES:
1. NEVER invent, guess, or hallucinate financial numbers. Strictly reference the numbers provided above.
2. If financial information is marked 'Not provided', state clearly that the borrower needs to confirm their income/expense records in their profile.
3. You are an advisory assistant: You CANNOT approve, reject, or modify loan terms. Decisions are made by authorized underwriters.
4. When answering affordability queries (e.g. "Can I afford ₹50,000?"):
   - Compare proposed EMI against their available monthly surplus (${surplusStr}).
   - If proposed EMI > monthly surplus, explain clearly why it causes liquidity strain.
   - If tenure is extended, explain that monthly EMI decreases but cumulative total interest paid increases.
5. Provide structured, empathetic, concise answers using Markdown with bold headers and bullet points.
6. Support Indian financial terminology where appropriate (EMI, CIBIL, UPI, SIP, tenure in months, ₹ symbol).
    `.trim();
  }
}

export const geminiService = new GeminiFinancialAdvisorService();

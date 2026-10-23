import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { dbService } from '../services/dbService';
import { geminiService, UserFinancialContext } from '../services/geminiService';
import { SAMPLE_PROFILES_DATA } from '../config/db';

export const getAdvisorStatus = async (req: AuthenticatedRequest, res: Response) => {
  const status = geminiService.getStatus();
  res.status(200).json({
    configured: status.configured,
    keyPresent: status.keyPresent,
    model: status.model,
    provider: 'Google GenAI SDK (@google/genai)',
    instructions: status.configured
      ? 'Gemini AI Assistant is fully configured and ready for live financial advisory.'
      : 'Set GEMINI_API_KEY in server/.env to enable live Gemini AI financial advisory responses.'
  });
};

/**
 * Safe, public diagnostic check for backend configuration without exposing secrets
 */
export const checkAdvisorConfig = async (_req: Request, res: Response) => {
  const status = geminiService.getStatus();
  res.status(200).json({
    status: 'OK',
    gemini: {
      sdk: status.sdk,
      model: status.model,
      configured: status.configured,
      keyPresent: status.keyPresent,
      formatValid: status.formatValid
    },
    message: status.configured
      ? 'Gemini API is securely configured in backend environment.'
      : 'Gemini API key is not configured or is a placeholder in server/.env.'
  });
};

/**
 * Authenticated test endpoint to trigger a real non-mock smoke test against Gemini
 */
export const testAdvisorLive = async (req: AuthenticatedRequest, res: Response) => {
  const result = await geminiService.testConnection();
  if (!result.success) {
    return res.status(result.error?.includes('not configured') ? 400 : 502).json({
      success: false,
      error: result.error,
      model: result.model,
      latencyMs: result.latencyMs
    });
  }
  res.status(200).json(result);
};

export const getChatHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const history = await dbService.chatHistory.findMany({ where: { userId } });
    res.status(200).json(history);
  } catch (error: any) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat log.' });
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Valid message content is required.' });
    }

    // Save user message to history
    await dbService.chatHistory.create({
      data: {
        userId,
        message: message.trim(),
        isBot: false
      }
    });

    // 1. Fetch factual user financial profile
    const userRecord = await dbService.user.findUnique({ where: { id: userId } });
    const userKyc = await dbService.kycDocument.findUnique({ where: { userId } });
    const userLoans = await dbService.loan.findMany({ where: { userId } });
    const userAlerts = await dbService.alert.findMany({ where: { userId } });

    // Match profile from sample dataset or existing DB metadata if available
    const matchedProfile = SAMPLE_PROFILES_DATA.find(p => p.email === userRecord?.email);

    const activeLoans = userLoans.filter(l => l.status === 'APPROVED' || l.status === 'ACTIVE');
    const primaryActiveLoan = activeLoans.length > 0 ? activeLoans[0] : null;
    const latestLoan = userLoans.length > 0 ? userLoans[userLoans.length - 1] : null;
    const latestPrediction = latestLoan?.prediction;

    // Retrieve live telemetry and credit assessment
    const { extractBorrowerFeatures, calculateCreditScoreForUser } = await import('../services/creditScoreService');
    const { telemetryStats } = await extractBorrowerFeatures(userId);

    let creditScore: number | undefined = latestPrediction?.creditScore;
    let riskCategory = latestPrediction?.riskCategory || 'MEDIUM';
    let defaultProbability = latestPrediction?.defaultProbability ?? 0.15;
    let financialHealthScore = latestPrediction?.financialHealth || 75.0;

    try {
      const assessment = await calculateCreditScoreForUser(userId);
      creditScore = assessment.creditScore;
      riskCategory = assessment.riskCategory;
      defaultProbability = assessment.defaultProbability;
      financialHealthScore = assessment.financialHealth;
    } catch {
      // Keep prediction from latest loan if live assessment is offline
    }

    const monthlyIncome = telemetryStats.verifiedIncome;
    const monthlyExpenses = telemetryStats.monthlyExpenses;
    const existingDebtEmis = activeLoans.reduce((sum, l) => sum + (Number(l.emi) || 0), 0);
    const monthlySurplus = monthlyIncome - monthlyExpenses - existingDebtEmis;
    const savings = Math.max(0, Math.round(monthlyIncome * 0.35));

    const context: UserFinancialContext = {
      userName: userRecord?.name || req.user?.email.split('@')[0] || 'Borrower',
      kycStatus: userKyc?.status || 'NOT_STARTED',
      monthlyIncome,
      monthlyExpenses,
      existingDebtEmis,
      monthlySurplus,
      savings,
      creditScore,
      riskCategory,
      defaultProbability,
      financialHealthScore,
      activeLoan: primaryActiveLoan ? {
        id: primaryActiveLoan.id,
        amount: primaryActiveLoan.amount,
        tenureMonths: primaryActiveLoan.tenureMonths,
        interestRate: primaryActiveLoan.interestRate,
        emi: primaryActiveLoan.emi,
        status: primaryActiveLoan.status,
        outstandingBalance: primaryActiveLoan.amount, // baseline if not repaid
        paidInstalments: 0,
        totalInstalments: primaryActiveLoan.tenureMonths
      } : null,
      allLoansSummary: userLoans.length > 0
        ? userLoans.map(l => `#${l.id.slice(0, 8)} (₹${l.amount}, ${l.tenureMonths}m, ${l.status})`).join('; ')
        : 'No previous loans on record',
      spendingBreakdown: matchedProfile?.spendingHabits?.categories || [
        { name: 'Rent & Living', percentage: 40 },
        { name: 'Food & Essentials', percentage: 30 },
        { name: 'Discretionary', percentage: 15 },
        { name: 'Savings Buffer', percentage: 15 }
      ]
    };

    // 2. Fetch past conversation turns
    const allHistory = await dbService.chatHistory.findMany({ where: { userId } });
    const conversationTurns = allHistory.slice(-8).map(h => ({
      role: (h.isBot ? 'model' : 'user') as 'user' | 'model',
      content: h.message
    }));

    // 3. Request Gemini advisory response
    const geminiResult = await geminiService.askAdvisor(message.trim(), context, conversationTurns);

    if (!geminiResult.success) {
      if (geminiResult.code === 'KEY_MISSING') {
        const guidanceMsg = `⚠️ **Gemini AI Configuration Notice**\n\nGoogle Gemini AI is selected as your advisory model, but \`GEMINI_API_KEY\` is not yet configured in the server environment.\n\n### How to Activate Live Gemini:\n1. Obtain a free API key at [Google AI Studio](https://aistudio.google.com/)\n2. Open \`server/.env\` and add:\n   \`\`\`bash\n   GEMINI_API_KEY=your_actual_key_here\n   \`\`\`\n3. Restart the server.\n\n*In the meantime, your deterministic calculations (EMI: ₹${primaryActiveLoan?.emi || 'N/A'}, Surplus: ₹${monthlySurplus.toLocaleString('en-IN')}) are fully active across the platform.*`;

        const savedMsg = await dbService.chatHistory.create({
          data: {
            userId,
            message: guidanceMsg,
            isBot: true
          }
        });

        return res.status(200).json({
          ...savedMsg,
          configured: false,
          isConfigNotice: true,
          setupInstructions: geminiResult.setupInstructions
        });
      }

      // Live call failure (quota or network error) -> display genuine error
      return res.status(502).json({
        error: geminiResult.error,
        code: geminiResult.code,
        setupInstructions: geminiResult.setupInstructions
      });
    }

    // 4. Save genuine Gemini bot reply
    const botReply = geminiResult.reply || 'No response generated.';
    const savedBotMsg = await dbService.chatHistory.create({
      data: {
        userId,
        message: botReply,
        isBot: true
      }
    });

    res.status(200).json({
      ...savedBotMsg,
      configured: true,
      modelUsed: geminiResult.modelUsed
    });
  } catch (error: any) {
    console.error('Advisor Chatbot error:', error);
    res.status(500).json({ error: 'Failed to process chat response: ' + error.message });
  }
};

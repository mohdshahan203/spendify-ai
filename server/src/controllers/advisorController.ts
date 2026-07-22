import { Response } from 'express';
import axios from 'axios';
import { AuthenticatedRequest } from '../middleware/auth';
import { dbService } from '../services/dbService';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

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
    if (!message) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // Save user message
    await dbService.chatHistory.create({
      data: {
        userId,
        message,
        isBot: false
      }
    });

    // Fetch user profile info for context
    const userLoans = await dbService.loan.findMany({ where: { userId } });
    const userKyc = await dbService.kycDocument.findUnique({ where: { userId } });

    const activeLoan = userLoans.find(l => l.status === 'ACTIVE');
    const latestLoan = userLoans.length > 0 ? userLoans[userLoans.length - 1] : null;

    let botReply = '';

    // Call ML Python chatbot endpoint
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/api/ml/chat`, {
        userId,
        message,
        profile: {
          name: req.user?.email.split('@')[0],
          kycStatus: userKyc?.status || 'NOT_STARTED',
          hasActiveLoan: !!activeLoan,
          activeLoanAmount: activeLoan?.amount || 0,
          latestLoanStatus: latestLoan?.status || null,
          creditScore: latestLoan?.prediction?.creditScore || null
        }
      });
      botReply = response.data.reply;
    } catch (error) {
      console.warn('⚠️ ML Chatbot service call failed. Generating backend NLP rule-based response.');
      
      const query = message.toLowerCase();

      // Rule-based fallback router
      if (query.includes('reject') || query.includes('why') && (query.includes('denied') || query.includes('rejection'))) {
        if (latestLoan && latestLoan.status === 'REJECTED') {
          botReply = `Your loan request of ₹${latestLoan.amount} was rejected due to a predicted high default risk (${(latestLoan.prediction?.defaultProbability ? latestLoan.prediction.defaultProbability * 100 : 65).toFixed(1)}%). Our models flagged volatility in monthly savings ratios. I recommend checking the loan restructuring options recommended in your loan details.`;
        } else {
          botReply = "I don't see any rejected loan requests on your profile. Typically, rejections occur due to insufficient income consistency, high debt-to-income ratios, or a low credit health score.";
        }
      } else if (query.includes('improve') || query.includes('score') || query.includes('raise')) {
        botReply = "To improve your credit score on SpendiFy: \n1. Complete utility and phone recharge payments on time.\n2. Keep your UPI transaction activity consistent.\n3. Avoid multiple overlapping loan applications.\n4. Maintain a savings ratio of at least 20% of your monthly income.";
      } else if (query.includes('emi') || query.includes('afford') || query.includes('how much')) {
        botReply = "A healthy EMI should not exceed 35% of your net monthly income. For example, if your monthly savings are consistently ₹15,000, an EMI of around ₹5,000 is highly affordable and safe for our underwriters.";
      } else if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
        botReply = `Hello! I am your SpendiFy AI Advisor. I can explain loan decisions, check your financial health metrics, and suggest actions to optimize your alternative credit rating. How can I help you today?`;
      } else {
        botReply = "Interesting question! As your financial advisor, I recommend maintaining low credit utilisation and checking our dashboard charts to see your SHAP explainability variables. This will help you keep your financial health score optimal.";
      }
    }

    // Save bot message
    const savedBotMsg = await dbService.chatHistory.create({
      data: {
        userId,
        message: botReply,
        isBot: true
      }
    });

    res.status(200).json(savedBotMsg);
  } catch (error: any) {
    console.error('Advisor Chatbot error:', error);
    res.status(500).json({ error: 'Failed to process chat response.' });
  }
};

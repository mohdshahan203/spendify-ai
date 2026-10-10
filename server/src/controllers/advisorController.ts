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

    // Fetch user profile info and prediction for context
    const userLoans = await dbService.loan.findMany({ 
      where: { userId }
    });
    const userKyc = await dbService.kycDocument.findUnique({ where: { userId } });
    const userRecord = await dbService.user.findUnique({ where: { id: userId } });

    const activeLoan = userLoans.find(l => l.status === 'APPROVED' || l.status === 'ACTIVE');
    const latestLoan = userLoans.length > 0 ? userLoans[userLoans.length - 1] : null;
    const prediction = latestLoan?.prediction;

    let botReply = '';

    // Call ML Python chatbot endpoint
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/api/ml/chat`, {
        userId,
        message,
        profile: {
          name: userRecord?.name || req.user?.email.split('@')[0],
          kycStatus: userKyc?.status || 'APPROVED',
          hasActiveLoan: !!activeLoan,
          activeLoanAmount: activeLoan?.amount || 0,
          latestLoanStatus: latestLoan?.status || 'APPROVED',
          creditScore: prediction?.creditScore || 750,
          financialHealthScore: prediction?.financialHealth || 90,
          riskCategory: prediction?.riskCategory || 'LOW',
          defaultProbability: prediction?.defaultProbability || 0.05
        }
      });
      botReply = response.data.reply;
    } catch (error) {
      console.warn('⚠️ ML Chatbot service call failed. Synthesizing AI response on Node backend.');
      
      const query = message.toLowerCase();
      const userName = userRecord?.name || 'Borrower';
      const score = prediction?.creditScore || 750;
      const risk = prediction?.riskCategory || 'LOW';

      if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
        botReply = `Hello ${userName}! 👋 I am **SpendiFy AI**, your financial assistant. Your current Credit Score is **${score}** (${risk} Risk). How can I help you today?`;
      } else if (query.includes('score') || query.includes('cibil') || query.includes('improve')) {
        botReply = `### 📊 Credit Score Breakdown for ${userName}\n\nYour current Credit Score is **${score} / 900** (${risk} Risk Tier).\n\n**Tips to Boost Your Score:**\n1. Maintain credit card utilization below 30%.\n2. Ensure zero missed EMI payments for 6 consecutive months.\n3. Keep older credit accounts active to build tenure.`;
      } else if (query.includes('loan') || query.includes('apply') || query.includes('eligible')) {
        botReply = `### 💳 Loan Eligibility Guide for ${userName}\n\nWith a credit score of **${score}**, you qualify for instant micro-loans up to **₹50,000** at competitive interest rates (11-13% p.a.). Would you like to submit an application on SpendiFy?`;
      } else {
        botReply = `### 🤖 SpendiFy AI Advisory\n\nThanks for reaching out, ${userName}! As your financial guide, I monitor your credit health (Score: **${score}**). Feel free to ask me about loan eligibility, EMI calculators, or score improvement steps!`;
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

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import './config/env';

import routes from './routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middlewares
app.use(cors({
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve KYC uploaded files securely (local static server for demo)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check APIs
app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'SpendiFy Backend Core API',
    environment: process.env.NODE_ENV || 'development',
    serverless: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
    timestamp: new Date().toISOString()
  });
});

app.get(['/', '/api'], (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'SpendiFy Unified Vercel API',
    version: '2.0.0'
  });
});

// ML Health check API
app.get(['/ml/health', '/api/ml/health'], async (req: Request, res: Response) => {
  const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  try {
    const axios = (await import('axios')).default;
    const mlRes = await axios.get(`${mlUrl}/health`, { timeout: 3000 });
    res.status(200).json({
      status: 'connected',
      serviceUrl: mlUrl.replace(/\/\/[^@]+@/, '//'),
      mlHealth: mlRes.data
    });
  } catch (err: any) {
    res.status(200).json({
      status: 'offline',
      serviceUrl: mlUrl.replace(/\/\/[^@]+@/, '//'),
      message: 'Python ML service is currently offline or unreachable. Credit scoring pipeline reports status honestly.',
      error: err.message
    });
  }
});

// Register Core APIs Router (mounted on both /api and / for serverless path flexibility)
app.use('/api', routes);
app.use('/', routes);

// Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Server only when not in serverless environment
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`🚀 SpendiFy core backend API is running on: http://localhost:${PORT}`);
  });
}

export default app;

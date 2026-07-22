import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// Health check API
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', service: 'SpendiFy Backend Core API' });
});

// Register Core APIs Router
app.use('/api', routes);

// Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 SpendiFy core backend API is running on: http://localhost:${PORT}`);
});

export default app;

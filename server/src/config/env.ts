import path from 'path';
import dotenv from 'dotenv';

// Load environment variables in priority order:
// 1. server/.env (backend specific)
// 2. root .env (root workspace / monorepo)
// 3. current process working directory fallback
const serverEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: serverEnvPath });
dotenv.config({ path: rootEnvPath });
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'spendify_secret_jwt_key',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'spendify_refresh_secret',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
};

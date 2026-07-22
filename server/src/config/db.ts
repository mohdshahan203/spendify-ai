import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

try {
  prisma = new PrismaClient();
} catch (error) {
  console.warn('Prisma client instantiation error. Fallback will be handled.', error);
}

// In-Memory Fallback DB Store for Zero-Setup execution
export class MockDatabase {
  users: any[] = [];
  kycDocuments: any[] = [];
  loans: any[] = [];
  transactions: any[] = [];
  predictions: any[] = [];
  recommendations: any[] = [];
  alerts: any[] = [];
  chats: any[] = [];

  constructor() {
    console.log('SpendiFy Mock Database initialized.');
  }

  async connect() {
    return true;
  }
}

export const mockDb = new MockDatabase();

// Export a function to check if PostgreSQL is available
export async function checkDbConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connection established successfully via Prisma.');
    return true;
  } catch (error) {
    console.warn('⚠️ PostgreSQL connection failed. Falling back to local memory database.');
    return false;
  }
}

export { prisma };

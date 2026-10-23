import type { Request, Response } from 'express';
import app from '../server/src/app';

// Standalone direct endpoint fallback for /api/health
export default function handler(req: any, res: any) {
  // Pass through to express app for consistent middleware and logging
  return app(req, res);
}

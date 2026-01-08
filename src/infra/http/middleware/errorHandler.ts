import { Request, Response, NextFunction } from 'express';
import { logError } from '../../../lib/logger';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  logError('Unhandled error', { err });
  res.status(500).json({ error: 'Internal Server Error' });
}

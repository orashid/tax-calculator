import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

export function adminOnly(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    return next(new AppError(403, 'Admin access required'));
  }
  next();
}

export function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: AuthPayload): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: '7d' });
}

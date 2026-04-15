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

export const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret' : '');
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Read token from HttpOnly cookie (preferred) or Authorization header (WebSocket/fallback)
  const token = req.cookies?.accessToken
    || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (!token) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthPayload;
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
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '15m' });
}

export function generateRefreshToken(payload: AuthPayload): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
}

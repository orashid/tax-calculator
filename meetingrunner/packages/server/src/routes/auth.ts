import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { loginSchema, refreshTokenSchema } from '@meetingrunner/shared';
import { prisma } from '../db.js';
import { validate } from '../middleware/validate.js';
import { generateAccessToken, generateRefreshToken, authMiddleware, AuthPayload } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export const authRoutes = Router();

authRoutes.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new AppError(401, 'Invalid email or password');
  }

  const payload: AuthPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  });
}));

authRoutes.post('/refresh', validate(refreshTokenSchema), asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  // Rotate: delete old token
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  let payload: AuthPayload;
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as AuthPayload;
    payload = { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
}));

authRoutes.post('/logout', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  // Delete all refresh tokens for this user
  await prisma.refreshToken.deleteMany({ where: { userId: req.user!.userId } });
  res.json({ message: 'Logged out' });
}));

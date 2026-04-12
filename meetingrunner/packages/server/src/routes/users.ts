import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { inviteUserSchema, updateUserSchema } from '@meetingrunner/shared';
import { prisma } from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import crypto from 'crypto';

export const userRoutes = Router();

userRoutes.use(authMiddleware);

userRoutes.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, displayName: true, role: true, avatarUrl: true, createdAt: true, updatedAt: true },
    orderBy: { displayName: 'asc' },
  });
  res.json(users);
}));

userRoutes.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, displayName: true, role: true, avatarUrl: true, createdAt: true, updatedAt: true },
  });
  if (!user) throw new AppError(404, 'User not found');
  res.json(user);
}));

userRoutes.post('/invite', adminOnly, validate(inviteUserSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, displayName, role } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'User with this email already exists');

  // Generate temporary password
  const tempPassword = crypto.randomBytes(16).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: { email, displayName, role: role || 'member', passwordHash },
    select: { id: true, email: true, displayName: true, role: true, avatarUrl: true, createdAt: true, updatedAt: true },
  });

  res.status(201).json({ user, temporaryPassword: tempPassword });
}));

userRoutes.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Users can update themselves; admins can update anyone
  if (req.user!.userId !== id && req.user!.role !== 'admin') {
    throw new AppError(403, 'Not authorized to update this user');
  }

  const data = updateUserSchema.parse(req.body);
  const updateData: Record<string, unknown> = {};

  if (data.displayName) updateData.displayName = data.displayName;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, displayName: true, role: true, avatarUrl: true, createdAt: true, updatedAt: true },
  });

  res.json(user);
}));

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { inviteUserSchema, updateUserSchema } from '@meetingrunner/shared';
import { prisma } from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import crypto from 'crypto';

const USER_SELECT = {
  id: true, email: true, displayName: true, role: true, avatarUrl: true,
  isActive: true, createdAt: true, updatedAt: true,
};

export const userRoutes = Router();

userRoutes.use(authMiddleware);

userRoutes.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { displayName: 'asc' },
  });
  res.json(users);
}));

userRoutes.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: USER_SELECT,
  });
  if (!user) throw new AppError(404, 'User not found');
  res.json(user);
}));

userRoutes.post('/invite', adminOnly, validate(inviteUserSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, displayName, role } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'User with this email already exists');

  const tempPassword = crypto.randomBytes(16).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: { email, displayName, role: role || 'member', passwordHash },
    select: USER_SELECT,
  });

  res.status(201).json({ user, temporaryPassword: tempPassword });
}));

userRoutes.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.user!.userId !== id && req.user!.role !== 'admin') {
    throw new AppError(403, 'Not authorized to update this user');
  }

  const data = updateUserSchema.parse(req.body);
  const updateData: Record<string, unknown> = {};

  if (data.displayName) updateData.displayName = data.displayName;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);
  // Only admins can change roles
  if (data.role && req.user!.role === 'admin') updateData.role = data.role;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: USER_SELECT,
  });

  res.json(user);
}));

// Deactivate user (admin only)
userRoutes.post('/:id/deactivate', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (id === req.user!.userId) {
    throw new AppError(400, 'Cannot deactivate your own account');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { isActive: false } }),
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
  ]);

  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  res.json(user);
}));

// Reactivate user (admin only)
userRoutes.post('/:id/reactivate', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: true },
    select: USER_SELECT,
  });

  res.json(user);
}));

// Reset password (admin only) — generates a new temp password
userRoutes.post('/:id/reset-password', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const tempPassword = crypto.randomBytes(16).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
  ]);

  res.json({ temporaryPassword: tempPassword });
}));

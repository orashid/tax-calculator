import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { PAGINATION } from '@meetingrunner/shared';

export const notificationRoutes = Router();

notificationRoutes.use(authMiddleware);

// List notifications for current user
notificationRoutes.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || PAGINATION.DEFAULT_PAGE_SIZE, PAGINATION.MAX_PAGE_SIZE);

  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    skip: (page - 1) * limit,
    take: limit,
  });

  res.json(notifications);
}));

// Get unread count
notificationRoutes.get('/unread-count', asyncHandler(async (req: Request, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.userId, isRead: false },
  });
  res.json({ count });
}));

// Mark notification as read
notificationRoutes.patch('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  res.json(updated);
}));

// Mark all as read
notificationRoutes.post('/read-all', asyncHandler(async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });

  res.json({ success: true });
}));

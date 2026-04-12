import { Router, Request, Response } from 'express';
import { createCommentSchema, updateCommentSchema } from '@meetingrunner/shared';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getSocketService } from '../websocket/socketService.js';
import { createNotification } from '../services/notificationService.js';

export const commentRoutes = Router();

commentRoutes.use(authMiddleware);

// Get comments for a card
commentRoutes.get('/cards/:cardId/comments', asyncHandler(async (req: Request, res: Response) => {
  const { cardId } = req.params;

  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { list: true } });
  if (!card) throw new AppError(404, 'Card not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  const comments = await prisma.comment.findMany({
    where: { cardId },
    include: {
      author: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Build threaded structure
  const topLevel = comments.filter((c) => !c.parentId);
  const commentMap = new Map(comments.map((c) => [c.id, { ...c, replies: [] as typeof comments }]));
  for (const comment of comments) {
    if (comment.parentId && commentMap.has(comment.parentId)) {
      commentMap.get(comment.parentId)!.replies.push(commentMap.get(comment.id)!);
    }
  }

  res.json(topLevel.map((c) => commentMap.get(c.id)));
}));

// Create comment
commentRoutes.post('/cards/:cardId/comments', validate(createCommentSchema), asyncHandler(async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const { body, parentId } = req.body;

  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { list: true } });
  if (!card) throw new AppError(404, 'Card not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent || parent.cardId !== cardId) throw new AppError(400, 'Invalid parent comment');
  }

  const comment = await prisma.comment.create({
    data: { cardId, authorId: req.user!.userId, body, parentId: parentId || null },
    include: {
      author: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true } },
    },
  });

  // Notify card assignees
  const assignees = await prisma.cardAssignee.findMany({ where: { cardId } });
  const commenterName = comment.author.displayName;
  for (const assignee of assignees) {
    if (assignee.userId !== req.user!.userId) {
      await createNotification(
        assignee.userId,
        'comment_added',
        cardId,
        `${commenterName} commented on "${card.title}"`,
      );
    }
  }

  getSocketService()?.emitToBoard(card.list.boardId, 'comment:created', { comment, cardId });
  res.status(201).json(comment);
}));

// Update comment
commentRoutes.patch('/comments/:id', validate(updateCommentSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) throw new AppError(404, 'Comment not found');

  if (comment.authorId !== req.user!.userId) {
    throw new AppError(403, 'Not authorized to edit this comment');
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: { body: req.body.body },
    include: {
      author: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true } },
    },
  });

  const card = await prisma.card.findUnique({ where: { id: comment.cardId }, include: { list: true } });
  if (card) {
    getSocketService()?.emitToBoard(card.list.boardId, 'comment:updated', { comment: updated });
  }

  res.json(updated);
}));

// Delete comment
commentRoutes.delete('/comments/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) throw new AppError(404, 'Comment not found');

  if (comment.authorId !== req.user!.userId && req.user!.role !== 'admin') {
    throw new AppError(403, 'Not authorized to delete this comment');
  }

  await prisma.comment.delete({ where: { id } });

  const card = await prisma.card.findUnique({ where: { id: comment.cardId }, include: { list: true } });
  if (card) {
    getSocketService()?.emitToBoard(card.list.boardId, 'comment:deleted', { commentId: id, cardId: comment.cardId });
  }

  res.status(204).send();
}));

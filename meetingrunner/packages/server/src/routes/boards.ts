import { Router, Request, Response } from 'express';
import { createBoardSchema, updateBoardSchema, addMemberSchema } from '@meetingrunner/shared';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getSocketService } from '../websocket/socketService.js';

export const boardRoutes = Router();

boardRoutes.use(authMiddleware);

// List boards for current user
boardRoutes.get('/', asyncHandler(async (req: Request, res: Response) => {
  const boards = await prisma.board.findMany({
    where: {
      members: { some: { userId: req.user!.userId } },
    },
    include: {
      _count: { select: { lists: true } },
      members: {
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(boards);
}));

// Create board
boardRoutes.post('/', validate(createBoardSchema), asyncHandler(async (req: Request, res: Response) => {
  const { title, description } = req.body;

  const board = await prisma.board.create({
    data: {
      title,
      description,
      createdBy: req.user!.userId,
      members: {
        create: { userId: req.user!.userId },
      },
    },
  });

  res.status(201).json(board);
}));

// Get board with all lists and cards
boardRoutes.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check membership
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: id, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              assignees: {
                include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true } } },
              },
              _count: { select: { comments: true, attachments: true } },
            },
          },
        },
      },
      members: {
        include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true } } },
      },
    },
  });

  if (!board) throw new AppError(404, 'Board not found');

  // Transform to match API types
  const transformed = {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        assignees: card.assignees.map((a) => a.user),
        commentCount: card._count.comments,
        attachmentCount: card._count.attachments,
        _count: undefined,
      })),
    })),
    members: board.members.map((m) => m.user),
  };

  res.json(transformed);
}));

// Update board
boardRoutes.patch('/:id', validate(updateBoardSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) throw new AppError(404, 'Board not found');

  if (board.createdBy !== req.user!.userId && req.user!.role !== 'admin') {
    throw new AppError(403, 'Not authorized to update this board');
  }

  const data = updateBoardSchema.parse(req.body);
  const updated = await prisma.board.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });

  res.json(updated);
}));

// Delete board
boardRoutes.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) throw new AppError(404, 'Board not found');

  if (board.createdBy !== req.user!.userId && req.user!.role !== 'admin') {
    throw new AppError(403, 'Not authorized to delete this board');
  }

  await prisma.board.delete({ where: { id } });
  res.status(204).send();
}));

// Add member to board
boardRoutes.post('/:id/members', validate(addMemberSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) throw new AppError(404, 'Board not found');

  // Only board creator or system admin can add members
  if (board.createdBy !== req.user!.userId && req.user!.role !== 'admin') {
    throw new AppError(403, 'Not authorized to manage board members');
  }

  await prisma.boardMember.create({
    data: { boardId: id, userId },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true },
  });

  getSocketService()?.emitToBoard(id, 'member:added', { boardId: id, user });
  res.status(201).json(user);
}));

// Remove member from board
boardRoutes.delete('/:id/members/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { id, userId } = req.params;

  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) throw new AppError(404, 'Board not found');

  if (board.createdBy !== req.user!.userId && req.user!.role !== 'admin') {
    throw new AppError(403, 'Not authorized to manage board members');
  }

  await prisma.boardMember.delete({
    where: { boardId_userId: { boardId: id, userId } },
  });

  getSocketService()?.emitToBoard(id, 'member:removed', { boardId: id, userId });
  res.status(204).send();
}));

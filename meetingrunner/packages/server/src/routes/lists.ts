import { Router, Request, Response } from 'express';
import { createListSchema, updateListSchema, reorderSchema } from '@meetingrunner/shared';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getSocketService } from '../websocket/socketService.js';

export const listRoutes = Router();

listRoutes.use(authMiddleware);

// Create list in a board
listRoutes.post('/boards/:boardId/lists', asyncHandler(async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const { title } = createListSchema.parse(req.body);

  // Check board membership
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  // Get next position
  const lastList = await prisma.list.findFirst({
    where: { boardId },
    orderBy: { position: 'desc' },
  });
  const position = (lastList?.position ?? -1) + 1;

  const list = await prisma.list.create({
    data: { boardId, title, position },
  });

  getSocketService()?.emitToBoard(boardId, 'list:created', { list });
  res.status(201).json(list);
}));

// Update list
listRoutes.patch('/lists/:id', validate(updateListSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const list = await prisma.list.findUnique({ where: { id }, include: { board: true } });
  if (!list) throw new AppError(404, 'List not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  const data = updateListSchema.parse(req.body);
  const updated = await prisma.list.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
    },
  });

  getSocketService()?.emitToBoard(list.boardId, 'list:updated', { list: updated });
  res.json(updated);
}));

// Delete list
listRoutes.delete('/lists/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const list = await prisma.list.findUnique({ where: { id } });
  if (!list) throw new AppError(404, 'List not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  await prisma.list.delete({ where: { id } });

  getSocketService()?.emitToBoard(list.boardId, 'list:deleted', { listId: id, boardId: list.boardId });
  res.status(204).send();
}));

// Reorder lists within a board
listRoutes.patch('/lists/reorder', validate(reorderSchema), asyncHandler(async (req: Request, res: Response) => {
  const { orderedIds } = req.body;

  // Verify ALL lists exist and belong to the same board
  const lists = await prisma.list.findMany({
    where: { id: { in: orderedIds } },
  });
  if (lists.length !== orderedIds.length) throw new AppError(404, 'One or more lists not found');

  const boardIds = new Set(lists.map((l) => l.boardId));
  if (boardIds.size !== 1) throw new AppError(400, 'All lists must belong to the same board');

  const boardId = [...boardIds][0];
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  // Update positions in a transaction
  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.list.update({ where: { id }, data: { position: index } }),
    ),
  );

  getSocketService()?.emitToBoard(boardId, 'list:reordered', {
    boardId,
    orderedIds,
  });

  res.json({ success: true });
}));

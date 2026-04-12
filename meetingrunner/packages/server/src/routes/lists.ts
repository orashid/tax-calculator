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

  const updated = await prisma.list.update({
    where: { id },
    data: req.body,
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

  // Get the board from the first list
  const firstList = await prisma.list.findUnique({ where: { id: orderedIds[0] } });
  if (!firstList) throw new AppError(404, 'List not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: firstList.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  // Update positions in a transaction
  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.list.update({ where: { id }, data: { position: index } }),
    ),
  );

  getSocketService()?.emitToBoard(firstList.boardId, 'list:reordered', {
    boardId: firstList.boardId,
    orderedIds,
  });

  res.json({ success: true });
}));

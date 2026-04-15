import { Router, Request, Response } from 'express';
import { createCardSchema, updateCardSchema, moveCardSchema, reorderSchema, addAssigneeSchema } from '@meetingrunner/shared';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getSocketService } from '../websocket/socketService.js';
import { createNotification } from '../services/notificationService.js';

export const cardRoutes = Router();

cardRoutes.use(authMiddleware);

// Helper to get card with summary fields
async function getCardSummary(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      assignees: {
        include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true } } },
      },
      _count: { select: { comments: true, attachments: true } },
    },
  });
  if (!card) return null;
  return {
    ...card,
    assignees: card.assignees.map((a) => a.user),
    commentCount: card._count.comments,
    attachmentCount: card._count.attachments,
    _count: undefined,
  };
}

// Helper to check board membership via list
async function checkListMembership(listId: string, userId: string) {
  const list = await prisma.list.findUnique({ where: { id: listId }, include: { board: true } });
  if (!list) throw new AppError(404, 'List not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: list.boardId, userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  return list;
}

// Create card in a list
cardRoutes.post('/lists/:listId/cards', asyncHandler(async (req: Request, res: Response) => {
  const { listId } = req.params;
  const data = createCardSchema.parse(req.body);

  const list = await checkListMembership(listId, req.user!.userId);

  // Get next position
  const lastCard = await prisma.card.findFirst({
    where: { listId },
    orderBy: { position: 'desc' },
  });
  const position = (lastCard?.position ?? -1) + 1;

  const card = await prisma.card.create({
    data: {
      listId,
      title: data.title,
      description: (data.description ?? undefined) as any,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      position,
      createdBy: req.user!.userId,
    },
  });

  const summary = await getCardSummary(card.id);
  getSocketService()?.emitToBoard(list.boardId, 'card:created', { card: summary, listId });
  res.status(201).json(summary);
}));

// Get card detail
cardRoutes.get('/cards/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      list: true,
      assignees: {
        include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true } } },
      },
      comments: {
        include: { author: { select: { id: true, email: true, displayName: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true } } },
        orderBy: { createdAt: 'asc' },
      },
      attachments: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!card) throw new AppError(404, 'Card not found');

  // Check membership
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  // Build threaded comments
  const topLevelComments = card.comments.filter((c) => !c.parentId);
  const commentMap = new Map(card.comments.map((c) => [c.id, { ...c, replies: [] as typeof card.comments }]));
  for (const comment of card.comments) {
    if (comment.parentId && commentMap.has(comment.parentId)) {
      commentMap.get(comment.parentId)!.replies.push(commentMap.get(comment.id)!);
    }
  }

  res.json({
    ...card,
    assignees: card.assignees.map((a) => a.user),
    comments: topLevelComments.map((c) => commentMap.get(c.id)),
    list: undefined,
  });
}));

// Update card
cardRoutes.patch('/cards/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = updateCardSchema.parse(req.body);

  const card = await prisma.card.findUnique({ where: { id }, include: { list: true } });
  if (!card) throw new AppError(404, 'Card not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;

  await prisma.card.update({ where: { id }, data: updateData });

  const summary = await getCardSummary(id);
  getSocketService()?.emitToBoard(card.list.boardId, 'card:updated', { card: summary });
  res.json(summary);
}));

// Delete card
cardRoutes.delete('/cards/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const card = await prisma.card.findUnique({ where: { id }, include: { list: true } });
  if (!card) throw new AppError(404, 'Card not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  await prisma.card.delete({ where: { id } });

  getSocketService()?.emitToBoard(card.list.boardId, 'card:deleted', { cardId: id, listId: card.listId });
  res.status(204).send();
}));

// Move card to another list
cardRoutes.post('/cards/:id/move', validate(moveCardSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetListId, position } = req.body;

  const card = await prisma.card.findUnique({ where: { id }, include: { list: true } });
  if (!card) throw new AppError(404, 'Card not found');

  const targetList = await prisma.list.findUnique({ where: { id: targetListId } });
  if (!targetList) throw new AppError(404, 'Target list not found');

  // Verify same board
  if (card.list.boardId !== targetList.boardId) {
    throw new AppError(400, 'Cannot move card to a different board');
  }

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  const fromListId = card.listId;

  // Shift cards in target list to make room
  await prisma.card.updateMany({
    where: { listId: targetListId, position: { gte: position } },
    data: { position: { increment: 1 } },
  });

  // Move the card
  await prisma.card.update({
    where: { id },
    data: { listId: targetListId, position },
  });

  // Close the gap in the source list
  await prisma.card.updateMany({
    where: { listId: fromListId, position: { gt: card.position } },
    data: { position: { decrement: 1 } },
  });

  getSocketService()?.emitToBoard(card.list.boardId, 'card:moved', {
    cardId: id,
    fromListId,
    toListId: targetListId,
    position,
  });

  const summary = await getCardSummary(id);
  res.json(summary);
}));

// Reorder cards within a list
cardRoutes.patch('/cards/reorder', validate(reorderSchema), asyncHandler(async (req: Request, res: Response) => {
  const { orderedIds } = req.body;

  // Verify ALL cards exist and belong to the same board
  const cards = await prisma.card.findMany({
    where: { id: { in: orderedIds } },
    include: { list: true },
  });
  if (cards.length !== orderedIds.length) throw new AppError(404, 'One or more cards not found');

  const boardIds = new Set(cards.map((c) => c.list.boardId));
  if (boardIds.size !== 1) throw new AppError(400, 'All cards must belong to the same board');

  const boardId = [...boardIds][0];
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.card.update({ where: { id }, data: { position: index } }),
    ),
  );

  res.json({ success: true });
}));

// Add assignee to card
cardRoutes.post('/cards/:id/assignees', validate(addAssigneeSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  const card = await prisma.card.findUnique({ where: { id }, include: { list: true } });
  if (!card) throw new AppError(404, 'Card not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  // Check that the assignee is a board member
  const assigneeMembership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId } },
  });
  if (!assigneeMembership) throw new AppError(400, 'User is not a member of this board');

  await prisma.cardAssignee.create({ data: { cardId: id, userId } });

  // Create notification for the assignee
  if (userId !== req.user!.userId) {
    await createNotification(userId, 'card_assigned', id, `You were assigned to "${card.title}"`);
  }

  const summary = await getCardSummary(id);
  getSocketService()?.emitToBoard(card.list.boardId, 'card:updated', { card: summary });
  res.json(summary);
}));

// Remove assignee from card
cardRoutes.delete('/cards/:id/assignees/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { id, userId } = req.params;

  const card = await prisma.card.findUnique({ where: { id }, include: { list: true } });
  if (!card) throw new AppError(404, 'Card not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  await prisma.cardAssignee.delete({
    where: { cardId_userId: { cardId: id, userId } },
  });

  const summary = await getCardSummary(id);
  getSocketService()?.emitToBoard(card.list.boardId, 'card:updated', { card: summary });
  res.json(summary);
}));

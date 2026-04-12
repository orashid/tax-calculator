import { Router, Request, Response } from 'express';
import { presignSchema, confirmAttachmentSchema } from '@meetingrunner/shared';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { generatePresignedUploadUrl, generatePresignedDownloadUrl, deleteObject } from '../services/s3Service.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export const attachmentRoutes = Router();

attachmentRoutes.use(authMiddleware);

// Get presigned upload URL
attachmentRoutes.post('/cards/:cardId/attachments/presign', validate(presignSchema), asyncHandler(async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const { filename, mimeType } = req.body;

  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { list: true } });
  if (!card) throw new AppError(404, 'Card not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  // Sanitize filename - prevent path traversal
  const sanitizedFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileKey = `attachments/${cardId}/${uuidv4()}-${sanitizedFilename}`;

  const uploadUrl = await generatePresignedUploadUrl(fileKey, mimeType);

  res.json({ uploadUrl, fileKey });
}));

// Confirm attachment upload
attachmentRoutes.post('/cards/:cardId/attachments', validate(confirmAttachmentSchema), asyncHandler(async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const { fileKey, filename, fileSize, mimeType } = req.body;

  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { list: true } });
  if (!card) throw new AppError(404, 'Card not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  const attachment = await prisma.attachment.create({
    data: {
      cardId,
      uploadedBy: req.user!.userId,
      filename: path.basename(filename),
      fileKey,
      fileSize,
      mimeType,
    },
  });

  res.status(201).json(attachment);
}));

// Delete attachment
attachmentRoutes.delete('/attachments/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) throw new AppError(404, 'Attachment not found');

  if (attachment.uploadedBy !== req.user!.userId && req.user!.role !== 'admin') {
    throw new AppError(403, 'Not authorized to delete this attachment');
  }

  await deleteObject(attachment.fileKey);
  await prisma.attachment.delete({ where: { id } });

  res.status(204).send();
}));

// Get presigned download URL
attachmentRoutes.get('/attachments/:id/url', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { card: { include: { list: true } } },
  });
  if (!attachment) throw new AppError(404, 'Attachment not found');

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: attachment.card.list.boardId, userId: req.user!.userId } },
  });
  if (!membership) throw new AppError(403, 'Not a member of this board');

  const downloadUrl = await generatePresignedDownloadUrl(attachment.fileKey);

  res.json({ downloadUrl, filename: attachment.filename });
}));

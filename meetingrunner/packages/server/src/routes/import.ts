import { Router, Request, Response } from 'express';
import express from 'express';
import { trelloJsonImportSchema, trelloCsvImportSchema } from '@meetingrunner/shared';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { parseTrelloJson, parseTrelloCsv, executeImport } from '../services/trelloImportService.js';

export const importRoutes = Router();

// Increase body size limit for import routes (Trello exports can be large)
importRoutes.use(express.json({ limit: '50mb' }));
importRoutes.use(authMiddleware);

// Import from Trello JSON export
importRoutes.post('/trello-json', asyncHandler(async (req: Request, res: Response) => {
  const data = trelloJsonImportSchema.parse(req.body);
  const parsed = parseTrelloJson(data);
  const result = await executeImport(parsed, req.user!.userId);
  res.status(201).json(result);
}));

// Import from Trello CSV export
importRoutes.post('/trello-csv', asyncHandler(async (req: Request, res: Response) => {
  const { boardTitle, csvData } = trelloCsvImportSchema.parse(req.body);
  try {
    const parsed = parseTrelloCsv(csvData, boardTitle);
    if (parsed.lists.length === 0) {
      throw new AppError(400, 'No data found in CSV. Ensure it has "Card Name" and "List Name" columns.');
    }
    const result = await executeImport(parsed, req.user!.userId);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(400, err instanceof Error ? err.message : 'Failed to parse CSV');
  }
}));

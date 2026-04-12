import express from 'express';
import cors from 'cors';
import { errorHandler } from '../middleware/errorHandler.js';
import { authRoutes } from '../routes/auth.js';
import { userRoutes } from '../routes/users.js';
import { boardRoutes } from '../routes/boards.js';
import { listRoutes } from '../routes/lists.js';
import { cardRoutes } from '../routes/cards.js';
import { commentRoutes } from '../routes/comments.js';
import { attachmentRoutes } from '../routes/attachments.js';
import { notificationRoutes } from '../routes/notifications.js';

export function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/boards', boardRoutes);
  app.use('/api/v1', listRoutes);
  app.use('/api/v1', cardRoutes);
  app.use('/api/v1', commentRoutes);
  app.use('/api/v1', attachmentRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);
  return app;
}

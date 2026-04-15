import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { boardRoutes } from './routes/boards.js';
import { listRoutes } from './routes/lists.js';
import { cardRoutes } from './routes/cards.js';
import { commentRoutes } from './routes/comments.js';
import { attachmentRoutes } from './routes/attachments.js';
import { notificationRoutes } from './routes/notifications.js';
import { importRoutes } from './routes/import.js';
import { setupWebSocket } from './websocket/index.js';
import { startDueDateChecker } from './jobs/dueDateChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('short'));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/boards', boardRoutes);
app.use('/api/v1', listRoutes);
app.use('/api/v1', cardRoutes);
app.use('/api/v1', commentRoutes);
app.use('/api/v1', attachmentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/import', importRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static client build in production
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Error handler
app.use(errorHandler);

// WebSocket
setupWebSocket(io);

// Start due date checker
startDueDateChecker();

const PORT = parseInt(process.env.PORT || '3000', 10);
httpServer.listen(PORT, () => {
  console.log(`MeetingRunner server running on port ${PORT}`);
});

export { app, httpServer, io };

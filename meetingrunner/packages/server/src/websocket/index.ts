import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { initSocketService } from './socketService.js';
import { AuthPayload } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function setupWebSocket(io: SocketIOServer): void {
  initSocketService(io);

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthPayload;

    // Join personal notification room
    socket.join(`user:${user.userId}`);

    // Join/leave board rooms
    socket.on('board:join', (boardId: string) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('board:leave', (boardId: string) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on('disconnect', () => {
      // Cleanup handled by socket.io
    });
  });
}

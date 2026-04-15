import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { initSocketService } from './socketService.js';
import { AuthPayload, JWT_SECRET } from '../middleware/auth.js';
import { prisma } from '../db.js';

export function setupWebSocket(io: SocketIOServer): void {
  initSocketService(io);

  // Auth middleware for socket connections — read token from cookie or handshake auth
  io.use((socket, next) => {
    let token = socket.handshake.auth.token;

    // Fall back to cookie if no auth token provided
    if (!token && socket.handshake.headers.cookie) {
      const cookies = cookie.parse(socket.handshake.headers.cookie);
      token = cookies.accessToken;
    }

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthPayload;
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

    // Join/leave board rooms — verify membership before joining
    socket.on('board:join', async (boardId: string) => {
      try {
        const membership = await prisma.boardMember.findUnique({
          where: { boardId_userId: { boardId, userId: user.userId } },
        });
        if (!membership) {
          socket.emit('error', { message: 'Not a member of this board' });
          return;
        }
        socket.join(`board:${boardId}`);
      } catch {
        socket.emit('error', { message: 'Failed to join board room' });
      }
    });

    socket.on('board:leave', (boardId: string) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on('disconnect', () => {
      // Cleanup handled by socket.io
    });
  });
}

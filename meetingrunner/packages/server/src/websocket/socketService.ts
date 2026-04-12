import { Server as SocketIOServer } from 'socket.io';

let socketService: SocketService | null = null;

export class SocketService {
  constructor(private io: SocketIOServer) {}

  emitToBoard(boardId: string, event: string, payload: unknown): void {
    this.io.to(`board:${boardId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.io.to(`user:${userId}`).emit(event, payload);
  }
}

export function initSocketService(io: SocketIOServer): SocketService {
  socketService = new SocketService(io);
  return socketService;
}

export function getSocketService(): SocketService | null {
  return socketService;
}

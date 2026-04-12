import { prisma } from '../db.js';
import { getSocketService } from '../websocket/socketService.js';

export async function createNotification(
  userId: string,
  type: string,
  cardId: string | null,
  message: string,
): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId, type, cardId, message },
  });

  getSocketService()?.emitToUser(userId, 'notification:new', { notification });
}

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBoardStore } from '../stores/boardStore.js';
import { useNotificationStore } from '../stores/notificationStore.js';
import type { CardSummary, List, Comment, Notification } from '@meetingrunner/shared';

let globalSocket: Socket | null = null;

export function initSocket(): Socket {
  if (globalSocket?.connected) return globalSocket;

  globalSocket = io({
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  return globalSocket;
}

export function disconnectSocket(): void {
  globalSocket?.disconnect();
  globalSocket = null;
}

export function useSocket(boardId: string | undefined): void {
  const socketRef = useRef<Socket | null>(null);
  const { addCard, updateCard, removeCard, moveCard, addList, updateList, removeList, reorderLists } = useBoardStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!boardId) return;

    const socket = initSocket();
    socketRef.current = socket;

    socket.emit('board:join', boardId);

    // Board events
    socket.on('card:created', ({ card, listId }: { card: CardSummary; listId: string }) => {
      addCard(listId, card);
    });
    socket.on('card:updated', ({ card }: { card: CardSummary }) => {
      updateCard(card);
    });
    socket.on('card:deleted', ({ cardId, listId }: { cardId: string; listId: string }) => {
      removeCard(listId, cardId);
    });
    socket.on('card:moved', ({ cardId, fromListId, toListId, position }: { cardId: string; fromListId: string; toListId: string; position: number }) => {
      moveCard(cardId, fromListId, toListId, position);
    });
    socket.on('list:created', ({ list }: { list: List }) => {
      addList(list);
    });
    socket.on('list:updated', ({ list }: { list: List }) => {
      updateList(list);
    });
    socket.on('list:deleted', ({ listId }: { listId: string }) => {
      removeList(listId);
    });
    socket.on('list:reordered', ({ orderedIds }: { orderedIds: string[] }) => {
      reorderLists(orderedIds);
    });

    // Notification events
    socket.on('notification:new', ({ notification }: { notification: Notification }) => {
      addNotification(notification);
    });

    return () => {
      socket.emit('board:leave', boardId);
      socket.off('card:created');
      socket.off('card:updated');
      socket.off('card:deleted');
      socket.off('card:moved');
      socket.off('list:created');
      socket.off('list:updated');
      socket.off('list:deleted');
      socket.off('list:reordered');
      socket.off('notification:new');
    };
  }, [boardId, addCard, updateCard, removeCard, moveCard, addList, updateList, removeList, reorderLists, addNotification]);
}

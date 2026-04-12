import { create } from 'zustand';
import type { Notification } from '@meetingrunner/shared';
import { api } from '../api/client.js';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;

  loadNotifications: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  setOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  loadNotifications: async () => {
    const notifications = await api.get<Notification[]>('/notifications');
    set({ notifications });
  },

  loadUnreadCount: async () => {
    const { count } = await api.get<{ count: number }>('/notifications/unread-count');
    set({ unreadCount: count });
  },

  markAsRead: async (id) => {
    await api.patch(`/notifications/${id}/read`, {});
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });
  },

  markAllAsRead: async () => {
    await api.post('/notifications/read-all');
    set({
      notifications: get().notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    });
  },

  addNotification: (notification) => {
    set({
      notifications: [notification, ...get().notifications],
      unreadCount: get().unreadCount + 1,
    });
  },

  setOpen: (open) => set({ isOpen: open }),
}));

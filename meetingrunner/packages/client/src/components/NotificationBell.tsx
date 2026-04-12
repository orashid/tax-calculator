import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useNotificationStore } from '../stores/notificationStore.js';
import clsx from 'clsx';

export default function NotificationBell() {
  const { notifications, unreadCount, isOpen, loadNotifications, loadUnreadCount, markAsRead, markAllAsRead, setOpen } =
    useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800">
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No notifications</div>
          ) : (
            <div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                  className={clsx(
                    'p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors',
                    !n.isRead && 'bg-blue-50',
                  )}
                >
                  <p className="text-sm text-gray-800">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

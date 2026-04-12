export const DUE_DATE_THRESHOLDS = {
  OVERDUE: 0,
  WARNING_DAYS: 3,
} as const;

export const ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export const NOTIFICATION_TYPES = {
  CARD_ASSIGNED: 'card_assigned',
  COMMENT_ADDED: 'comment_added',
  DUE_APPROACHING: 'due_approaching',
  DUE_OVERDUE: 'due_overdue',
} as const;

export const JWT_EXPIRY = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
} as const;

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const DUE_DATE_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

import { z } from 'zod';

// Auth
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// Users
export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  role: z.enum(['admin', 'member']).optional().default('member'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'member']).optional(),
});

// Boards
export const createBoardSchema = z.object({
  title: z.string().min(1, 'Board title is required').max(200),
  description: z.string().max(2000).optional(),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

// Lists
export const createListSchema = z.object({
  title: z.string().min(1, 'List title is required').max(200),
});

export const updateListSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

// Cards
export const createCardSchema = z.object({
  title: z.string().min(1, 'Card title is required').max(500),
  description: z.unknown().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.unknown().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const moveCardSchema = z.object({
  targetListId: z.string().uuid(),
  position: z.number().int().min(0),
});

// Card Assignees
export const addAssigneeSchema = z.object({
  userId: z.string().uuid(),
});

// Comments
export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(10000),
  parentId: z.string().uuid().optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});

// Board Members
export const addMemberSchema = z.object({
  userId: z.string().uuid(),
});

// UUID param validation
export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// Trello import — use passthrough() to allow extra fields from real Trello exports
export const trelloJsonImportSchema = z.object({
  name: z.string().min(1),
  desc: z.string().optional().default(''),
  lists: z.array(z.object({
    id: z.string(),
    name: z.string(),
    pos: z.number(),
    closed: z.boolean(),
  }).passthrough()),
  cards: z.array(z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional().default(''),
    idList: z.string(),
    due: z.string().nullable(),
    pos: z.number(),
    closed: z.boolean(),
  }).passthrough()),
  actions: z.array(z.object({
    type: z.string(),
    data: z.record(z.unknown()),
    date: z.string(),
    memberCreator: z.object({ fullName: z.string() }).passthrough().optional(),
  }).passthrough()).optional().default([]),
}).passthrough();

export const trelloCsvImportSchema = z.object({
  boardTitle: z.string().min(1).max(200),
  csvData: z.string().min(1),
});

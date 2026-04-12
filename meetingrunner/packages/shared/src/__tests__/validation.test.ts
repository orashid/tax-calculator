import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  inviteUserSchema,
  createBoardSchema,
  createListSchema,
  createCardSchema,
  updateCardSchema,
  moveCardSchema,
  createCommentSchema,
  presignSchema,
  confirmAttachmentSchema,
  reorderSchema,
  addAssigneeSchema,
  addMemberSchema,
  refreshTokenSchema,
  updateUserSchema,
  updateBoardSchema,
  updateListSchema,
  updateCommentSchema,
} from '../validation/index.js';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'password123' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-email', password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'password123' });
    expect(result.success).toBe(false);
  });
});

describe('refreshTokenSchema', () => {
  it('accepts valid token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: 'some-token-value' });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });
});

describe('inviteUserSchema', () => {
  it('accepts valid invite with default role', () => {
    const result = inviteUserSchema.safeParse({ email: 'new@example.com', displayName: 'New User' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('member');
    }
  });

  it('accepts admin role', () => {
    const result = inviteUserSchema.safeParse({ email: 'admin@example.com', displayName: 'Admin', role: 'admin' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = inviteUserSchema.safeParse({ email: 'test@example.com', displayName: 'Test', role: 'superuser' });
    expect(result.success).toBe(false);
  });

  it('rejects empty display name', () => {
    const result = inviteUserSchema.safeParse({ email: 'test@example.com', displayName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects display name over 100 chars', () => {
    const result = inviteUserSchema.safeParse({ email: 'test@example.com', displayName: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('accepts partial updates', () => {
    const result = updateUserSchema.safeParse({ displayName: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('accepts password update', () => {
    const result = updateUserSchema.safeParse({ password: 'newpassword123' });
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = updateUserSchema.safeParse({ password: 'short' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable avatar', () => {
    const result = updateUserSchema.safeParse({ avatarUrl: null });
    expect(result.success).toBe(true);
  });
});

describe('createBoardSchema', () => {
  it('accepts valid board', () => {
    const result = createBoardSchema.safeParse({ title: 'Staff Meeting' });
    expect(result.success).toBe(true);
  });

  it('accepts board with description', () => {
    const result = createBoardSchema.safeParse({ title: 'Staff Meeting', description: 'Weekly sync' });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createBoardSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title over 200 chars', () => {
    const result = createBoardSchema.safeParse({ title: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe('updateBoardSchema', () => {
  it('accepts partial update', () => {
    const result = updateBoardSchema.safeParse({ title: 'New Title' });
    expect(result.success).toBe(true);
  });

  it('accepts nullable description', () => {
    const result = updateBoardSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });
});

describe('createListSchema', () => {
  it('accepts valid list', () => {
    const result = createListSchema.safeParse({ title: 'Action Items' });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createListSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });
});

describe('updateListSchema', () => {
  it('accepts title update', () => {
    const result = updateListSchema.safeParse({ title: 'Updated List' });
    expect(result.success).toBe(true);
  });
});

describe('reorderSchema', () => {
  it('accepts valid UUIDs', () => {
    const result = reorderSchema.safeParse({
      orderedIds: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    const result = reorderSchema.safeParse({ orderedIds: [] });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID strings', () => {
    const result = reorderSchema.safeParse({ orderedIds: ['not-a-uuid'] });
    expect(result.success).toBe(false);
  });
});

describe('createCardSchema', () => {
  it('accepts minimal card', () => {
    const result = createCardSchema.safeParse({ title: 'Review budget' });
    expect(result.success).toBe(true);
  });

  it('accepts card with due date', () => {
    const result = createCardSchema.safeParse({
      title: 'Review budget',
      dueDate: '2026-04-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createCardSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title over 500 chars', () => {
    const result = createCardSchema.safeParse({ title: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createCardSchema.safeParse({ title: 'Test', dueDate: 'not-a-date' });
    expect(result.success).toBe(false);
  });
});

describe('updateCardSchema', () => {
  it('accepts partial update', () => {
    const result = updateCardSchema.safeParse({ title: 'Updated title' });
    expect(result.success).toBe(true);
  });

  it('accepts nullable due date', () => {
    const result = updateCardSchema.safeParse({ dueDate: null });
    expect(result.success).toBe(true);
  });

  it('accepts nullable description', () => {
    const result = updateCardSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });
});

describe('moveCardSchema', () => {
  it('accepts valid move', () => {
    const result = moveCardSchema.safeParse({
      targetListId: '123e4567-e89b-12d3-a456-426614174000',
      position: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative position', () => {
    const result = moveCardSchema.safeParse({
      targetListId: '123e4567-e89b-12d3-a456-426614174000',
      position: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID target', () => {
    const result = moveCardSchema.safeParse({ targetListId: 'not-uuid', position: 0 });
    expect(result.success).toBe(false);
  });
});

describe('addAssigneeSchema', () => {
  it('accepts valid UUID', () => {
    const result = addAssigneeSchema.safeParse({ userId: '123e4567-e89b-12d3-a456-426614174000' });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID', () => {
    const result = addAssigneeSchema.safeParse({ userId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('addMemberSchema', () => {
  it('accepts valid UUID', () => {
    const result = addMemberSchema.safeParse({ userId: '123e4567-e89b-12d3-a456-426614174000' });
    expect(result.success).toBe(true);
  });
});

describe('createCommentSchema', () => {
  it('accepts valid comment', () => {
    const result = createCommentSchema.safeParse({ body: 'This is a comment' });
    expect(result.success).toBe(true);
  });

  it('accepts comment with parent', () => {
    const result = createCommentSchema.safeParse({
      body: 'Reply',
      parentId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty body', () => {
    const result = createCommentSchema.safeParse({ body: '' });
    expect(result.success).toBe(false);
  });

  it('rejects body over 10000 chars', () => {
    const result = createCommentSchema.safeParse({ body: 'a'.repeat(10001) });
    expect(result.success).toBe(false);
  });
});

describe('updateCommentSchema', () => {
  it('accepts valid body', () => {
    const result = updateCommentSchema.safeParse({ body: 'Updated comment' });
    expect(result.success).toBe(true);
  });

  it('rejects empty body', () => {
    const result = updateCommentSchema.safeParse({ body: '' });
    expect(result.success).toBe(false);
  });
});

describe('presignSchema', () => {
  it('accepts valid presign request', () => {
    const result = presignSchema.safeParse({ filename: 'report.pdf', mimeType: 'application/pdf' });
    expect(result.success).toBe(true);
  });

  it('rejects empty filename', () => {
    const result = presignSchema.safeParse({ filename: '', mimeType: 'application/pdf' });
    expect(result.success).toBe(false);
  });
});

describe('confirmAttachmentSchema', () => {
  it('accepts valid confirmation', () => {
    const result = confirmAttachmentSchema.safeParse({
      fileKey: 'attachments/card-id/uuid-file.pdf',
      filename: 'report.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
    });
    expect(result.success).toBe(true);
  });

  it('rejects file over 25MB', () => {
    const result = confirmAttachmentSchema.safeParse({
      fileKey: 'key',
      filename: 'big.zip',
      fileSize: 26 * 1024 * 1024,
      mimeType: 'application/zip',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero file size', () => {
    const result = confirmAttachmentSchema.safeParse({
      fileKey: 'key',
      filename: 'empty.txt',
      fileSize: 0,
      mimeType: 'text/plain',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative file size', () => {
    const result = confirmAttachmentSchema.safeParse({
      fileKey: 'key',
      filename: 'file.txt',
      fileSize: -100,
      mimeType: 'text/plain',
    });
    expect(result.success).toBe(false);
  });
});

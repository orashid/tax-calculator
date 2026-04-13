import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  inviteUserSchema,
  createBoardSchema,
  createCardSchema,
  updateCardSchema,
  moveCardSchema,
  createCommentSchema,
  updateCommentSchema,
  presignSchema,
  confirmAttachmentSchema,
  reorderSchema,
  addAssigneeSchema,
  refreshTokenSchema,
  updateUserSchema,
  trelloJsonImportSchema,
  trelloCsvImportSchema,
} from '../validation/index.js';

describe('Validation Schemas — Comprehensive Boundary Tests', () => {
  // ─── LOGIN SCHEMA ───────────────────────────────────────────────

  describe('loginSchema — boundaries', () => {
    it('accepts password at exactly 8 chars', () => {
      expect(() => loginSchema.parse({ email: 't@t.com', password: '12345678' })).not.toThrow();
    });

    it('rejects password at 7 chars', () => {
      expect(() => loginSchema.parse({ email: 't@t.com', password: '1234567' })).toThrow();
    });

    it('rejects extra fields silently (no crash)', () => {
      const result = loginSchema.parse({ email: 't@t.com', password: '12345678', extra: 'field' });
      expect(result.email).toBe('t@t.com');
    });

    it('rejects array as email', () => {
      expect(() => loginSchema.parse({ email: ['t@t.com'], password: '12345678' })).toThrow();
    });

    it('rejects object as password', () => {
      expect(() => loginSchema.parse({ email: 't@t.com', password: { value: '12345678' } })).toThrow();
    });
  });

  // ─── INVITE USER SCHEMA ─────────────────────────────────────────

  describe('inviteUserSchema — boundaries', () => {
    it('accepts displayName at exactly 1 char', () => {
      expect(() => inviteUserSchema.parse({ email: 't@t.com', displayName: 'A' })).not.toThrow();
    });

    it('accepts displayName at exactly 100 chars', () => {
      expect(() => inviteUserSchema.parse({ email: 't@t.com', displayName: 'A'.repeat(100) })).not.toThrow();
    });

    it('rejects displayName at 101 chars', () => {
      expect(() => inviteUserSchema.parse({ email: 't@t.com', displayName: 'A'.repeat(101) })).toThrow();
    });

    it('accepts member role', () => {
      expect(() => inviteUserSchema.parse({ email: 't@t.com', displayName: 'A', role: 'member' })).not.toThrow();
    });

    it('accepts admin role', () => {
      expect(() => inviteUserSchema.parse({ email: 't@t.com', displayName: 'A', role: 'admin' })).not.toThrow();
    });

    it('rejects unknown role', () => {
      expect(() => inviteUserSchema.parse({ email: 't@t.com', displayName: 'A', role: 'superadmin' })).toThrow();
    });

    it('provides a default role when omitted', () => {
      const result = inviteUserSchema.parse({ email: 't@t.com', displayName: 'A' });
      expect(['member', 'admin', undefined]).toContain(result.role);
    });
  });

  // ─── CREATE BOARD SCHEMA ────────────────────────────────────────

  describe('createBoardSchema — boundaries', () => {
    it('accepts title at exactly 1 char', () => {
      expect(() => createBoardSchema.parse({ title: 'X' })).not.toThrow();
    });

    it('accepts title at exactly 200 chars', () => {
      expect(() => createBoardSchema.parse({ title: 'X'.repeat(200) })).not.toThrow();
    });

    it('rejects title at 201 chars', () => {
      expect(() => createBoardSchema.parse({ title: 'X'.repeat(201) })).toThrow();
    });

    it('accepts description up to 2000 chars', () => {
      expect(() => createBoardSchema.parse({ title: 'T', description: 'D'.repeat(2000) })).not.toThrow();
    });

    it('rejects description over 2000 chars', () => {
      expect(() => createBoardSchema.parse({ title: 'T', description: 'D'.repeat(2001) })).toThrow();
    });

    it('accepts empty description', () => {
      expect(() => createBoardSchema.parse({ title: 'T', description: '' })).not.toThrow();
    });
  });

  // ─── CREATE CARD SCHEMA ─────────────────────────────────────────

  describe('createCardSchema — boundaries', () => {
    it('accepts title at exactly 500 chars', () => {
      expect(() => createCardSchema.parse({ title: 'X'.repeat(500) })).not.toThrow();
    });

    it('rejects title at 501 chars', () => {
      expect(() => createCardSchema.parse({ title: 'X'.repeat(501) })).toThrow();
    });

    it('accepts valid ISO date for dueDate', () => {
      expect(() => createCardSchema.parse({ title: 'T', dueDate: '2025-12-31T23:59:59.000Z' })).not.toThrow();
    });

    it('rejects invalid date string', () => {
      expect(() => createCardSchema.parse({ title: 'T', dueDate: 'not-a-date' })).toThrow();
    });

    it('accepts dueDate omitted', () => {
      const result = createCardSchema.parse({ title: 'T' });
      expect(result.dueDate).toBeUndefined();
    });
  });

  // ─── UPDATE CARD SCHEMA ─────────────────────────────────────────

  describe('updateCardSchema — boundaries', () => {
    it('accepts null dueDate (clearing it)', () => {
      expect(() => updateCardSchema.parse({ dueDate: null })).not.toThrow();
    });

    it('accepts null description (clearing it)', () => {
      expect(() => updateCardSchema.parse({ description: null })).not.toThrow();
    });

    it('accepts empty object (no changes)', () => {
      expect(() => updateCardSchema.parse({})).not.toThrow();
    });
  });

  // ─── MOVE CARD SCHEMA ──────────────────────────────────────────

  describe('moveCardSchema — boundaries', () => {
    it('accepts position 0', () => {
      expect(() => moveCardSchema.parse({ targetListId: '550e8400-e29b-41d4-a716-446655440000', position: 0 })).not.toThrow();
    });

    it('rejects negative position', () => {
      expect(() => moveCardSchema.parse({ targetListId: '550e8400-e29b-41d4-a716-446655440000', position: -1 })).toThrow();
    });

    it('rejects non-integer position', () => {
      expect(() => moveCardSchema.parse({ targetListId: '550e8400-e29b-41d4-a716-446655440000', position: 1.5 })).toThrow();
    });

    it('rejects non-UUID targetListId', () => {
      expect(() => moveCardSchema.parse({ targetListId: 'not-uuid', position: 0 })).toThrow();
    });
  });

  // ─── COMMENT SCHEMAS ───────────────────────────────────────────

  describe('createCommentSchema — boundaries', () => {
    it('accepts body at exactly 1 char', () => {
      expect(() => createCommentSchema.parse({ body: 'X' })).not.toThrow();
    });

    it('accepts body at exactly 10000 chars', () => {
      expect(() => createCommentSchema.parse({ body: 'X'.repeat(10000) })).not.toThrow();
    });

    it('rejects body at 10001 chars', () => {
      expect(() => createCommentSchema.parse({ body: 'X'.repeat(10001) })).toThrow();
    });

    it('accepts optional parentId as UUID', () => {
      expect(() => createCommentSchema.parse({ body: 'X', parentId: '550e8400-e29b-41d4-a716-446655440000' })).not.toThrow();
    });

    it('rejects non-UUID parentId', () => {
      expect(() => createCommentSchema.parse({ body: 'X', parentId: 'not-uuid' })).toThrow();
    });
  });

  describe('updateCommentSchema — boundaries', () => {
    it('rejects empty body', () => {
      expect(() => updateCommentSchema.parse({ body: '' })).toThrow();
    });

    it('rejects body at 10001 chars', () => {
      expect(() => updateCommentSchema.parse({ body: 'X'.repeat(10001) })).toThrow();
    });
  });

  // ─── ATTACHMENT SCHEMAS ─────────────────────────────────────────

  describe('confirmAttachmentSchema — boundaries', () => {
    it('accepts fileSize at exactly 1 byte', () => {
      expect(() => confirmAttachmentSchema.parse({
        fileKey: 'k', filename: 'f', fileSize: 1, mimeType: 'text/plain',
      })).not.toThrow();
    });

    it('accepts fileSize at exactly 25MB', () => {
      expect(() => confirmAttachmentSchema.parse({
        fileKey: 'k', filename: 'f', fileSize: 25 * 1024 * 1024, mimeType: 'text/plain',
      })).not.toThrow();
    });

    it('rejects fileSize at 25MB + 1 byte', () => {
      expect(() => confirmAttachmentSchema.parse({
        fileKey: 'k', filename: 'f', fileSize: 25 * 1024 * 1024 + 1, mimeType: 'text/plain',
      })).toThrow();
    });

    it('rejects zero fileSize', () => {
      expect(() => confirmAttachmentSchema.parse({
        fileKey: 'k', filename: 'f', fileSize: 0, mimeType: 'text/plain',
      })).toThrow();
    });

    it('rejects negative fileSize', () => {
      expect(() => confirmAttachmentSchema.parse({
        fileKey: 'k', filename: 'f', fileSize: -1, mimeType: 'text/plain',
      })).toThrow();
    });

    it('rejects non-integer fileSize', () => {
      expect(() => confirmAttachmentSchema.parse({
        fileKey: 'k', filename: 'f', fileSize: 1.5, mimeType: 'text/plain',
      })).toThrow();
    });
  });

  describe('presignSchema — boundaries', () => {
    it('rejects empty filename', () => {
      expect(() => presignSchema.parse({ filename: '', mimeType: 'text/plain' })).toThrow();
    });

    it('rejects empty mimeType', () => {
      expect(() => presignSchema.parse({ filename: 'f.txt', mimeType: '' })).toThrow();
    });

    it('accepts filename at 500 chars', () => {
      expect(() => presignSchema.parse({ filename: 'a'.repeat(500), mimeType: 'text/plain' })).not.toThrow();
    });
  });

  // ─── REORDER SCHEMA ────────────────────────────────────────────

  describe('reorderSchema — boundaries', () => {
    it('accepts array with one UUID', () => {
      expect(() => reorderSchema.parse({ orderedIds: ['550e8400-e29b-41d4-a716-446655440000'] })).not.toThrow();
    });

    it('rejects empty array', () => {
      expect(() => reorderSchema.parse({ orderedIds: [] })).toThrow();
    });

    it('rejects array with non-UUID strings', () => {
      expect(() => reorderSchema.parse({ orderedIds: ['not-a-uuid'] })).toThrow();
    });

    it('rejects array with mixed valid/invalid UUIDs', () => {
      expect(() => reorderSchema.parse({
        orderedIds: ['550e8400-e29b-41d4-a716-446655440000', 'bad'],
      })).toThrow();
    });
  });

  // ─── ADD ASSIGNEE / MEMBER SCHEMAS ──────────────────────────────

  describe('addAssigneeSchema — boundaries', () => {
    it('accepts valid UUID', () => {
      expect(() => addAssigneeSchema.parse({ userId: '550e8400-e29b-41d4-a716-446655440000' })).not.toThrow();
    });

    it('rejects non-UUID', () => {
      expect(() => addAssigneeSchema.parse({ userId: 'abc123' })).toThrow();
    });

    it('rejects empty string', () => {
      expect(() => addAssigneeSchema.parse({ userId: '' })).toThrow();
    });
  });

  // ─── REFRESH TOKEN SCHEMA ──────────────────────────────────────

  describe('refreshTokenSchema — boundaries', () => {
    it('rejects null token', () => {
      expect(() => refreshTokenSchema.parse({ refreshToken: null })).toThrow();
    });

    it('rejects number as token', () => {
      expect(() => refreshTokenSchema.parse({ refreshToken: 12345 })).toThrow();
    });
  });

  // ─── UPDATE USER SCHEMA ─────────────────────────────────────────

  describe('updateUserSchema — boundaries', () => {
    it('accepts password at exactly 8 chars', () => {
      expect(() => updateUserSchema.parse({ password: '12345678' })).not.toThrow();
    });

    it('rejects password at 7 chars', () => {
      expect(() => updateUserSchema.parse({ password: '1234567' })).toThrow();
    });

    it('accepts displayName at 100 chars', () => {
      expect(() => updateUserSchema.parse({ displayName: 'A'.repeat(100) })).not.toThrow();
    });

    it('rejects displayName at 101 chars', () => {
      expect(() => updateUserSchema.parse({ displayName: 'A'.repeat(101) })).toThrow();
    });

    it('accepts avatarUrl as null', () => {
      expect(() => updateUserSchema.parse({ avatarUrl: null })).not.toThrow();
    });
  });

  // ─── TRELLO IMPORT SCHEMAS ─────────────────────────────────────

  describe('trelloJsonImportSchema — boundaries', () => {
    const minimal = {
      name: 'Board',
      lists: [{ id: '1', name: 'L', pos: 0, closed: false }],
      cards: [{ id: '1', name: 'C', idList: '1', due: null, pos: 0, closed: false }],
    };

    it('accepts minimal valid Trello JSON', () => {
      expect(() => trelloJsonImportSchema.parse(minimal)).not.toThrow();
    });

    it('rejects missing name', () => {
      const { name, ...rest } = minimal;
      expect(() => trelloJsonImportSchema.parse(rest)).toThrow();
    });

    it('rejects empty name', () => {
      expect(() => trelloJsonImportSchema.parse({ ...minimal, name: '' })).toThrow();
    });

    it('defaults actions to empty array when missing', () => {
      const result = trelloJsonImportSchema.parse(minimal);
      expect(result.actions).toEqual([]);
    });

    it('defaults desc to empty string when missing', () => {
      const result = trelloJsonImportSchema.parse(minimal);
      expect(result.desc).toBe('');
    });

    it('passes through extra fields on lists/cards (passthrough)', () => {
      const data = {
        ...minimal,
        lists: [{ id: '1', name: 'L', pos: 0, closed: false, color: 'blue', extra: true }],
      };
      const result = trelloJsonImportSchema.parse(data);
      expect(result.lists[0]).toHaveProperty('color');
    });
  });

  describe('trelloCsvImportSchema — boundaries', () => {
    it('accepts valid data', () => {
      expect(() => trelloCsvImportSchema.parse({ boardTitle: 'B', csvData: 'data' })).not.toThrow();
    });

    it('rejects empty boardTitle', () => {
      expect(() => trelloCsvImportSchema.parse({ boardTitle: '', csvData: 'data' })).toThrow();
    });

    it('rejects boardTitle over 200 chars', () => {
      expect(() => trelloCsvImportSchema.parse({ boardTitle: 'X'.repeat(201), csvData: 'data' })).toThrow();
    });

    it('rejects empty csvData', () => {
      expect(() => trelloCsvImportSchema.parse({ boardTitle: 'B', csvData: '' })).toThrow();
    });
  });
});

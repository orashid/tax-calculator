import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export const testPrisma = new PrismaClient();

export function generateTestToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

export function generateExpiredToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '0s' });
}

export async function createTestUser(overrides: {
  email?: string;
  displayName?: string;
  role?: string;
  password?: string;
} = {}) {
  const passwordHash = await bcrypt.hash(overrides.password || 'testpass123', 4); // low rounds for speed
  return testPrisma.user.create({
    data: {
      email: overrides.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
      displayName: overrides.displayName || 'Test User',
      role: overrides.role || 'member',
      passwordHash,
    },
  });
}

export async function createTestBoard(createdBy: string, title?: string) {
  const board = await testPrisma.board.create({
    data: {
      title: title || `Test Board ${Date.now()}`,
      createdBy,
      members: { create: { userId: createdBy } },
    },
  });
  return board;
}

export async function createTestList(boardId: string, title?: string, position?: number) {
  return testPrisma.list.create({
    data: {
      boardId,
      title: title || `Test List ${Date.now()}`,
      position: position ?? 0,
    },
  });
}

export async function createTestCard(listId: string, createdBy: string, overrides: {
  title?: string;
  position?: number;
  dueDate?: Date;
} = {}) {
  return testPrisma.card.create({
    data: {
      listId,
      title: overrides.title || `Test Card ${Date.now()}`,
      position: overrides.position ?? 0,
      createdBy,
    },
  });
}

export async function cleanupTestData() {
  // Use raw SQL for clean truncation respecting FK constraints
  await testPrisma.$executeRawUnsafe(`
    TRUNCATE TABLE notifications, attachments, comments, card_assignees, cards, lists, board_members, boards, refresh_tokens, users CASCADE
  `);
}

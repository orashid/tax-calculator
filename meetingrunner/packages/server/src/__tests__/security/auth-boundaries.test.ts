import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../app.js';
import {
  testPrisma,
  createTestUser,
  createTestBoard,
  createTestList,
  createTestCard,
  generateTestToken,
  generateExpiredToken,
  cleanupTestData,
} from '../helpers.js';

const app = createTestApp();

describe('Security: Authentication & Authorization Boundaries', () => {
  let adminUser: any;
  let memberUser: any;
  let adminToken: string;
  let memberToken: string;

  beforeEach(async () => {
    await cleanupTestData();
    adminUser = await createTestUser({ email: 'sec-admin@test.com', role: 'admin' });
    memberUser = await createTestUser({ email: 'sec-member@test.com', role: 'member' });
    adminToken = generateTestToken({ userId: adminUser.id, email: adminUser.email, role: 'admin' });
    memberToken = generateTestToken({ userId: memberUser.id, email: memberUser.email, role: 'member' });
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  describe('Unauthenticated Access (401)', () => {
    const protectedRoutes = [
      { method: 'get', path: '/api/v1/users' },
      { method: 'get', path: '/api/v1/users/me' },
      { method: 'get', path: '/api/v1/boards' },
      { method: 'post', path: '/api/v1/boards' },
      { method: 'get', path: '/api/v1/notifications' },
      { method: 'get', path: '/api/v1/notifications/unread-count' },
    ];

    for (const route of protectedRoutes) {
      it(`rejects ${route.method.toUpperCase()} ${route.path} without token`, async () => {
        const res = await (request(app) as any)[route.method](route.path);
        expect(res.status).toBe(401);
      });
    }

    it('rejects request with malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/boards')
        .set('Authorization', 'Bearer malformed-token');

      expect(res.status).toBe(401);
    });

    it('rejects request with expired token', async () => {
      const expiredToken = generateExpiredToken({
        userId: memberUser.id,
        email: memberUser.email,
        role: 'member',
      });

      // Wait a moment for token to expire
      await new Promise((r) => setTimeout(r, 100));

      const res = await request(app)
        .get('/api/v1/boards')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('rejects token without Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/v1/boards')
        .set('Authorization', memberToken);

      expect(res.status).toBe(401);
    });
  });

  describe('Board Access Control (403)', () => {
    it('prevents non-member from accessing board details', async () => {
      const board = await createTestBoard(adminUser.id);

      const res = await request(app)
        .get(`/api/v1/boards/${board.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('prevents non-member from creating cards in a board', async () => {
      const board = await createTestBoard(adminUser.id);
      const list = await createTestList(board.id, 'Test List');

      const res = await request(app)
        .post(`/api/v1/lists/${list.id}/cards`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Unauthorized card' });

      expect(res.status).toBe(403);
    });

    it('prevents non-member from viewing cards in a board', async () => {
      const board = await createTestBoard(adminUser.id);
      const list = await createTestList(board.id, 'Test List');
      const card = await createTestCard(list.id, adminUser.id);

      const res = await request(app)
        .get(`/api/v1/cards/${card.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('allows board member to add other members', async () => {
      const board = await createTestBoard(adminUser.id);
      // Add member first
      await testPrisma.boardMember.create({
        data: { boardId: board.id, userId: memberUser.id },
      });

      const otherUser = await createTestUser({ email: 'other@test.com' });

      const res = await request(app)
        .post(`/api/v1/boards/${board.id}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: otherUser.id });

      expect(res.status).toBe(201);
    });

    it('prevents non-member from adding board members', async () => {
      const board = await createTestBoard(adminUser.id);
      const otherUser = await createTestUser({ email: 'other@test.com' });

      // memberUser is NOT a member of this board
      const res = await request(app)
        .post(`/api/v1/boards/${board.id}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: otherUser.id });

      expect(res.status).toBe(403);
    });
  });

  describe('Admin-Only Endpoints', () => {
    it('prevents member from inviting users', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'newuser@test.com', displayName: 'New User' });

      expect(res.status).toBe(403);
    });

    it('allows admin to invite users', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invited@test.com', displayName: 'Invited' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('invited@test.com');
      expect(res.body).toHaveProperty('temporaryPassword');
    });
  });

  describe('Password Reset Authorization', () => {
    it('prevents member from resetting another user password', async () => {
      const targetUser = await createTestUser({ email: 'sec-target@test.com' });

      const res = await request(app)
        .post(`/api/v1/users/${targetUser.id}/reset-password`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ newPassword: 'hackedpass123' });

      expect(res.status).toBe(403);
    });

    it('allows admin to reset another user password', async () => {
      const targetUser = await createTestUser({ email: 'sec-reset-target@test.com' });

      const res = await request(app)
        .post(`/api/v1/users/${targetUser.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'newpass12345' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password reset');
    });

    it('rejects password reset without authentication', async () => {
      const targetUser = await createTestUser({ email: 'sec-noauth@test.com' });

      const res = await request(app)
        .post(`/api/v1/users/${targetUser.id}/reset-password`)
        .send({ newPassword: 'newpass12345' });

      expect(res.status).toBe(401);
    });

    it('rejects password reset with weak password', async () => {
      const targetUser = await createTestUser({ email: 'sec-weak@test.com' });

      const res = await request(app)
        .post(`/api/v1/users/${targetUser.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: '123' });

      expect(res.status).toBe(400);
    });

    it('invalidates all sessions after password reset', async () => {
      const target = await createTestUser({ email: 'sec-session@test.com', password: 'oldpass123' });

      // Target logs in to create a refresh token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'sec-session@test.com', password: 'oldpass123' });

      const oldRefreshToken = loginRes.body.refreshToken;

      // Admin resets password
      await request(app)
        .post(`/api/v1/users/${target.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'newpass12345' });

      // Old refresh token should be invalidated
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('IDOR Prevention', () => {
    it('prevents user from editing another user comment', async () => {
      const board = await createTestBoard(adminUser.id);
      await testPrisma.boardMember.create({
        data: { boardId: board.id, userId: memberUser.id },
      });
      const list = await createTestList(board.id, 'Test List');
      const card = await createTestCard(list.id, adminUser.id);

      // Admin creates a comment
      const comment = await testPrisma.comment.create({
        data: {
          cardId: card.id,
          authorId: adminUser.id,
          body: 'Admin comment',
        },
      });

      // Member tries to edit admin's comment
      const res = await request(app)
        .patch(`/api/v1/comments/${comment.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ body: 'Hacked comment' });

      expect(res.status).toBe(403);
    });

    it('prevents user from deleting another user comment (non-admin)', async () => {
      const board = await createTestBoard(adminUser.id);
      await testPrisma.boardMember.create({
        data: { boardId: board.id, userId: memberUser.id },
      });
      const list = await createTestList(board.id, 'Test List');
      const card = await createTestCard(list.id, adminUser.id);

      const comment = await testPrisma.comment.create({
        data: {
          cardId: card.id,
          authorId: adminUser.id,
          body: 'Admin comment',
        },
      });

      const res = await request(app)
        .delete(`/api/v1/comments/${comment.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('prevents accessing cards from a different board via direct ID', async () => {
      // Admin board with card
      const adminBoard = await createTestBoard(adminUser.id);
      const adminList = await createTestList(adminBoard.id, 'Admin List');
      const adminCard = await createTestCard(adminList.id, adminUser.id, { title: 'Secret card' });

      // Member board (separate)
      const memberBoard = await createTestBoard(memberUser.id);

      // Member tries to access admin's card directly
      const res = await request(app)
        .get(`/api/v1/cards/${adminCard.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('prevents user from updating another user profile (non-admin)', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ displayName: 'Hacked Name' });

      expect(res.status).toBe(403);
    });

    it('allows user to update their own profile', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${memberUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ displayName: 'My New Name' });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('My New Name');
    });
  });
});

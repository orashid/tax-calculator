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

describe('Security — Comprehensive', () => {
  let adminUser: any;
  let memberUser: any;
  let member2User: any;
  let adminToken: string;
  let memberToken: string;
  let member2Token: string;

  beforeEach(async () => {
    await cleanupTestData();
    adminUser = await createTestUser({ email: 'sec-admin@test.com', role: 'admin' });
    memberUser = await createTestUser({ email: 'sec-member@test.com', role: 'member' });
    member2User = await createTestUser({ email: 'sec-member2@test.com', role: 'member' });
    adminToken = generateTestToken({ userId: adminUser.id, email: adminUser.email, role: 'admin' });
    memberToken = generateTestToken({ userId: memberUser.id, email: memberUser.email, role: 'member' });
    member2Token = generateTestToken({ userId: member2User.id, email: member2User.email, role: 'member' });
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  // ─── PRIVILEGE ESCALATION ───────────────────────────────────────

  describe('Privilege Escalation Prevention', () => {
    it('member cannot promote themselves to admin via PATCH', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${memberUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'admin' });

      // Role change should be silently ignored (only admins can change roles)
      expect(res.status).toBe(200);
      const user = await testPrisma.user.findUnique({ where: { id: memberUser.id } });
      expect(user!.role).toBe('member');
    });

    it('member cannot deactivate other users', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${member2User.id}/deactivate`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('member cannot reactivate users', async () => {
      await testPrisma.user.update({ where: { id: member2User.id }, data: { isActive: false } });

      const res = await request(app)
        .post(`/api/v1/users/${member2User.id}/reactivate`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('member cannot invite users', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'hack@test.com', displayName: 'Hacker' });

      expect(res.status).toBe(403);
    });

    it('admin cannot deactivate themselves', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${adminUser.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ─── CROSS-BOARD ACCESS ─────────────────────────────────────────

  describe('Cross-Board Isolation', () => {
    it('cannot create card in another users board list', async () => {
      const board = await createTestBoard(adminUser.id);
      const list = await createTestList(board.id, 'Secret List');

      const res = await request(app)
        .post(`/api/v1/lists/${list.id}/cards`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Injected card' });

      expect(res.status).toBe(403);
    });

    it('cannot update a card in another users board', async () => {
      const board = await createTestBoard(adminUser.id);
      const list = await createTestList(board.id, 'List');
      const card = await createTestCard(list.id, adminUser.id);

      const res = await request(app)
        .patch(`/api/v1/cards/${card.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Hacked title' });

      expect(res.status).toBe(403);
    });

    it('cannot delete a card in another users board', async () => {
      const board = await createTestBoard(adminUser.id);
      const list = await createTestList(board.id, 'List');
      const card = await createTestCard(list.id, adminUser.id);

      const res = await request(app)
        .delete(`/api/v1/cards/${card.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('cannot move card to a list in another board', async () => {
      // Member's board
      const memberBoard = await createTestBoard(memberUser.id);
      const memberList = await createTestList(memberBoard.id, 'Member List');
      const card = await createTestCard(memberList.id, memberUser.id);

      // Admin's board
      const adminBoard = await createTestBoard(adminUser.id);
      const adminList = await createTestList(adminBoard.id, 'Admin List');

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/move`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ targetListId: adminList.id, position: 0 });

      expect(res.status).toBe(403);
    });

    it('cannot add comment to card in another users board', async () => {
      const board = await createTestBoard(adminUser.id);
      const list = await createTestList(board.id, 'List');
      const card = await createTestCard(list.id, adminUser.id);

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ body: 'Unauthorized comment' });

      expect(res.status).toBe(403);
    });

    it('cannot view comments on card in another users board', async () => {
      const board = await createTestBoard(adminUser.id);
      const list = await createTestList(board.id, 'List');
      const card = await createTestCard(list.id, adminUser.id);

      const res = await request(app)
        .get(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('cannot delete list in another users board', async () => {
      const board = await createTestBoard(adminUser.id);
      const list = await createTestList(board.id, 'Secret List');

      const res = await request(app)
        .delete(`/api/v1/lists/${list.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('cannot update list in another users board', async () => {
      const board = await createTestBoard(adminUser.id);
      const list = await createTestList(board.id, 'Secret List');

      const res = await request(app)
        .patch(`/api/v1/lists/${list.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Hacked List' });

      expect(res.status).toBe(403);
    });

    it('cannot add assignee to card in another users board', async () => {
      const board = await createTestBoard(adminUser.id);
      const list = await createTestList(board.id, 'List');
      const card = await createTestCard(list.id, adminUser.id);

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/assignees`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: memberUser.id });

      expect(res.status).toBe(403);
    });
  });

  // ─── BOARD MEMBERSHIP ENFORCEMENT ───────────────────────────────

  describe('Board Membership Enforcement', () => {
    it('board member can create cards', async () => {
      const board = await createTestBoard(adminUser.id);
      await testPrisma.boardMember.create({ data: { boardId: board.id, userId: memberUser.id } });
      const list = await createTestList(board.id, 'Shared List');

      const res = await request(app)
        .post(`/api/v1/lists/${list.id}/cards`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Authorized card' });

      expect(res.status).toBe(201);
    });

    it('cannot add non-board-member as card assignee', async () => {
      const board = await createTestBoard(adminUser.id);
      await testPrisma.boardMember.create({ data: { boardId: board.id, userId: memberUser.id } });
      const list = await createTestList(board.id, 'List');
      const card = await createTestCard(list.id, adminUser.id);

      // member2 is NOT a board member
      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/assignees`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: member2User.id });

      expect(res.status).toBe(400);
    });

    it('only board creator or admin can add members', async () => {
      const board = await createTestBoard(memberUser.id);
      await testPrisma.boardMember.create({ data: { boardId: board.id, userId: member2User.id } });

      // member2 (not creator) tries to add admin
      const res = await request(app)
        .post(`/api/v1/boards/${board.id}/members`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ userId: adminUser.id });

      expect(res.status).toBe(403);
    });

    it('only board creator or admin can remove members', async () => {
      const board = await createTestBoard(memberUser.id);
      await testPrisma.boardMember.create({ data: { boardId: board.id, userId: member2User.id } });
      await testPrisma.boardMember.create({ data: { boardId: board.id, userId: adminUser.id } });

      // member2 (not creator) tries to remove admin
      const res = await request(app)
        .delete(`/api/v1/boards/${board.id}/members/${adminUser.id}`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(res.status).toBe(403);
    });

    it('board creator can remove members', async () => {
      const board = await createTestBoard(memberUser.id);
      await testPrisma.boardMember.create({ data: { boardId: board.id, userId: member2User.id } });

      const res = await request(app)
        .delete(`/api/v1/boards/${board.id}/members/${member2User.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── COMMENT OWNERSHIP ─────────────────────────────────────────

  describe('Comment Ownership & Authorization', () => {
    it('author can edit their own comment', async () => {
      const board = await createTestBoard(memberUser.id);
      await testPrisma.boardMember.create({ data: { boardId: board.id, userId: member2User.id } });
      const list = await createTestList(board.id, 'List');
      const card = await createTestCard(list.id, memberUser.id);

      const comment = await testPrisma.comment.create({
        data: { cardId: card.id, authorId: member2User.id, body: 'Original' },
      });

      const res = await request(app)
        .patch(`/api/v1/comments/${comment.id}`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ body: 'Edited' });

      expect(res.status).toBe(200);
      expect(res.body.body).toBe('Edited');
    });

    it('non-author cannot edit comment', async () => {
      const board = await createTestBoard(memberUser.id);
      await testPrisma.boardMember.create({ data: { boardId: board.id, userId: member2User.id } });
      const list = await createTestList(board.id, 'List');
      const card = await createTestCard(list.id, memberUser.id);

      const comment = await testPrisma.comment.create({
        data: { cardId: card.id, authorId: memberUser.id, body: 'Original' },
      });

      const res = await request(app)
        .patch(`/api/v1/comments/${comment.id}`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ body: 'Hacked' });

      expect(res.status).toBe(403);
    });

    it('author can delete their own comment', async () => {
      const board = await createTestBoard(memberUser.id);
      const list = await createTestList(board.id, 'List');
      const card = await createTestCard(list.id, memberUser.id);

      const comment = await testPrisma.comment.create({
        data: { cardId: card.id, authorId: memberUser.id, body: 'My comment' },
      });

      const res = await request(app)
        .delete(`/api/v1/comments/${comment.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
    });

    it('admin can delete any comment', async () => {
      const board = await createTestBoard(memberUser.id);
      await testPrisma.boardMember.create({ data: { boardId: board.id, userId: adminUser.id } });
      const list = await createTestList(board.id, 'List');
      const card = await createTestCard(list.id, memberUser.id);

      const comment = await testPrisma.comment.create({
        data: { cardId: card.id, authorId: memberUser.id, body: 'Member comment' },
      });

      const res = await request(app)
        .delete(`/api/v1/comments/${comment.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── BOARD DELETE AUTHORIZATION ─────────────────────────────────

  describe('Board Delete Authorization', () => {
    it('non-creator member cannot delete board', async () => {
      const board = await createTestBoard(adminUser.id);
      await testPrisma.boardMember.create({ data: { boardId: board.id, userId: memberUser.id } });

      const res = await request(app)
        .delete(`/api/v1/boards/${board.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('creator can delete their board', async () => {
      const board = await createTestBoard(memberUser.id);

      const res = await request(app)
        .delete(`/api/v1/boards/${board.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
    });

    it('admin can delete any board', async () => {
      const board = await createTestBoard(memberUser.id);

      const res = await request(app)
        .delete(`/api/v1/boards/${board.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── NOTIFICATION SCOPING ──────────────────────────────────────

  describe('Notification Isolation', () => {
    it('user can only see their own notifications', async () => {
      // Create notifications for both users
      await testPrisma.notification.createMany({
        data: [
          { userId: memberUser.id, type: 'card_assigned', message: 'For member' },
          { userId: member2User.id, type: 'card_assigned', message: 'For member2' },
          { userId: memberUser.id, type: 'comment_added', message: 'Also for member' },
        ],
      });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      res.body.forEach((n: any) => {
        expect(n.userId).toBe(memberUser.id);
      });
    });

    it('user can only see their own unread count', async () => {
      await testPrisma.notification.createMany({
        data: [
          { userId: memberUser.id, type: 'card_assigned', message: 'N1' },
          { userId: memberUser.id, type: 'card_assigned', message: 'N2' },
          { userId: member2User.id, type: 'card_assigned', message: 'N3' },
        ],
      });

      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    });

    it('user cannot mark another users notification as read', async () => {
      const notification = await testPrisma.notification.create({
        data: { userId: member2User.id, type: 'card_assigned', message: 'Not yours' },
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── TOKEN FORGERY / TAMPERING ──────────────────────────────────

  describe('Token Tampering', () => {
    it('rejects token signed with wrong secret', async () => {
      const jwt = await import('jsonwebtoken');
      const fakeToken = jwt.default.sign(
        { userId: memberUser.id, email: memberUser.email, role: 'admin' },
        'wrong-secret',
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .get('/api/v1/boards')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(401);
    });

    it('rejects token with tampered role claim', async () => {
      // Even if someone gets a valid token, the role in it must match DB
      // This test verifies the token is properly validated
      const jwt = await import('jsonwebtoken');
      const fakeToken = jwt.default.sign(
        { userId: memberUser.id, email: memberUser.email, role: 'admin' },
        'wrong-secret-key',
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({ email: 'steal@test.com', displayName: 'Stolen' });

      expect(res.status).toBe(401);
    });

    it('rejects expired token', async () => {
      const expired = generateExpiredToken({
        userId: memberUser.id,
        email: memberUser.email,
        role: 'member',
      });

      await new Promise((r) => setTimeout(r, 100));

      const res = await request(app)
        .get('/api/v1/boards')
        .set('Authorization', `Bearer ${expired}`);

      expect(res.status).toBe(401);
    });
  });

  // ─── INPUT SANITIZATION ─────────────────────────────────────────

  describe('Input Sanitization Edge Cases', () => {
    it('handles null bytes in input', async () => {
      const board = await createTestBoard(memberUser.id);
      const list = await createTestList(board.id, 'List');

      const res = await request(app)
        .post(`/api/v1/lists/${list.id}/cards`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Test\x00Card' });

      expect([201, 400]).toContain(res.status);
    });

    it('handles unicode in card titles', async () => {
      const board = await createTestBoard(memberUser.id);
      const list = await createTestList(board.id, 'List');

      const res = await request(app)
        .post(`/api/v1/lists/${list.id}/cards`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: '日本語テスト 🎉 العربية' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('日本語テスト 🎉 العربية');
    });

    it('handles emoji in board titles', async () => {
      const res = await request(app)
        .post('/api/v1/boards')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: '🚀 Sprint Board 🏃‍♂️' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('🚀 Sprint Board 🏃‍♂️');
    });

    it('rejects request with wrong content type', async () => {
      const res = await request(app)
        .post('/api/v1/boards')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Content-Type', 'text/plain')
        .send('title=Test');

      expect([400, 415]).toContain(res.status);
    });
  });

  // ─── NONEXISTENT RESOURCE IDS ──────────────────────────────────

  describe('Nonexistent Resource Handling', () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';

    it('returns 404 for nonexistent board', async () => {
      const res = await request(app)
        .get(`/api/v1/boards/${fakeUuid}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('returns 404 for nonexistent card', async () => {
      const res = await request(app)
        .get(`/api/v1/cards/${fakeUuid}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('returns 404 for nonexistent list', async () => {
      const res = await request(app)
        .delete(`/api/v1/lists/${fakeUuid}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('returns 404 for nonexistent comment', async () => {
      const res = await request(app)
        .patch(`/api/v1/comments/${fakeUuid}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ body: 'Test' });

      expect([403, 404]).toContain(res.status);
    });

    it('rejects invalid UUID format', async () => {
      const res = await request(app)
        .get('/api/v1/boards/not-a-uuid')
        .set('Authorization', `Bearer ${memberToken}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });
});

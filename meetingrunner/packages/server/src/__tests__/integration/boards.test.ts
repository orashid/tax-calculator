import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../app.js';
import { testPrisma, createTestUser, createTestBoard, generateTestToken, cleanupTestData } from '../helpers.js';

const app = createTestApp();

describe('Board Routes', () => {
  let adminUser: any;
  let memberUser: any;
  let adminToken: string;
  let memberToken: string;

  beforeEach(async () => {
    await cleanupTestData();
    adminUser = await createTestUser({ email: 'admin@test.com', role: 'admin' });
    memberUser = await createTestUser({ email: 'member@test.com', role: 'member' });
    adminToken = generateTestToken({ userId: adminUser.id, email: adminUser.email, role: 'admin' });
    memberToken = generateTestToken({ userId: memberUser.id, email: memberUser.email, role: 'member' });
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  describe('POST /api/v1/boards', () => {
    it('creates a board and adds creator as member', async () => {
      const res = await request(app)
        .post('/api/v1/boards')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Staff Meeting' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Staff Meeting');
      expect(res.body.createdBy).toBe(memberUser.id);

      // Verify membership
      const membership = await testPrisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: res.body.id, userId: memberUser.id } },
      });
      expect(membership).not.toBeNull();
    });

    it('rejects empty title', async () => {
      const res = await request(app)
        .post('/api/v1/boards')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/boards', () => {
    it('returns only boards the user is a member of', async () => {
      await createTestBoard(adminUser.id, 'Admin Board');
      const memberBoard = await createTestBoard(memberUser.id, 'Member Board');

      const res = await request(app)
        .get('/api/v1/boards')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Member Board');
    });
  });

  describe('GET /api/v1/boards/:id', () => {
    it('returns board with lists and cards for a member', async () => {
      const board = await createTestBoard(memberUser.id);

      const res = await request(app)
        .get(`/api/v1/boards/${board.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(board.id);
      expect(res.body).toHaveProperty('lists');
      expect(res.body).toHaveProperty('members');
    });

    it('returns 403 for non-member', async () => {
      const board = await createTestBoard(adminUser.id);

      const res = await request(app)
        .get(`/api/v1/boards/${board.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/boards/:id', () => {
    it('allows creator to delete', async () => {
      const board = await createTestBoard(memberUser.id);

      const res = await request(app)
        .delete(`/api/v1/boards/${board.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(204);
    });

    it('allows admin to delete any board', async () => {
      const board = await createTestBoard(memberUser.id);

      const res = await request(app)
        .delete(`/api/v1/boards/${board.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });

    it('prevents non-creator member from deleting', async () => {
      const board = await createTestBoard(adminUser.id);
      // Add member to the board first
      await testPrisma.boardMember.create({
        data: { boardId: board.id, userId: memberUser.id },
      });

      const res = await request(app)
        .delete(`/api/v1/boards/${board.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Board Members', () => {
    it('creator adds a member to the board', async () => {
      const board = await createTestBoard(adminUser.id);

      const res = await request(app)
        .post(`/api/v1/boards/${board.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUser.id });

      expect(res.status).toBe(201);
    });

    it('board member can add another user to the board', async () => {
      const board = await createTestBoard(adminUser.id);
      await testPrisma.boardMember.create({
        data: { boardId: board.id, userId: memberUser.id },
      });

      const thirdUser = await createTestUser({ email: 'third@test.com' });

      const res = await request(app)
        .post(`/api/v1/boards/${board.id}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: thirdUser.id });

      expect(res.status).toBe(201);
    });

    it('non-member cannot add members to the board', async () => {
      const board = await createTestBoard(adminUser.id);
      const thirdUser = await createTestUser({ email: 'third@test.com' });

      // memberUser is NOT a member of this board
      const res = await request(app)
        .post(`/api/v1/boards/${board.id}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: thirdUser.id });

      expect(res.status).toBe(403);
    });

    it('removes a member from the board', async () => {
      const board = await createTestBoard(adminUser.id);
      await testPrisma.boardMember.create({
        data: { boardId: board.id, userId: memberUser.id },
      });

      const res = await request(app)
        .delete(`/api/v1/boards/${board.id}/members/${memberUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });

    it('board member cannot remove other members (only creator/admin)', async () => {
      const board = await createTestBoard(adminUser.id);
      await testPrisma.boardMember.create({
        data: { boardId: board.id, userId: memberUser.id },
      });

      const res = await request(app)
        .delete(`/api/v1/boards/${board.id}/members/${adminUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });
});

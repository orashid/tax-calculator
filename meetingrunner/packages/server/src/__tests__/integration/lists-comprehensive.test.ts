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
  cleanupTestData,
} from '../helpers.js';

const app = createTestApp();

describe('List Routes — Comprehensive', () => {
  let user: any;
  let token: string;
  let board: any;

  beforeEach(async () => {
    await cleanupTestData();
    user = await createTestUser({ email: 'list-user@test.com' });
    token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });
    board = await createTestBoard(user.id);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  // ─── CREATE LIST ────────────────────────────────────────────────

  describe('POST /api/v1/boards/:boardId/lists', () => {
    it('creates a list with auto-incrementing position', async () => {
      const res1 = await request(app)
        .post(`/api/v1/boards/${board.id}/lists`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'First' });

      const res2 = await request(app)
        .post(`/api/v1/boards/${board.id}/lists`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Second' });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res2.body.position).toBeGreaterThan(res1.body.position);
    });

    it('rejects empty title', async () => {
      const res = await request(app)
        .post(`/api/v1/boards/${board.id}/lists`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });

    it('rejects title over 200 chars', async () => {
      const res = await request(app)
        .post(`/api/v1/boards/${board.id}/lists`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'A'.repeat(201) });

      expect(res.status).toBe(400);
    });

    it('accepts title at exactly 200 chars', async () => {
      const res = await request(app)
        .post(`/api/v1/boards/${board.id}/lists`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'A'.repeat(200) });

      expect(res.status).toBe(201);
    });

    it('rejects for non-board-member', async () => {
      const outsider = await createTestUser({ email: 'outsider@test.com' });
      const outsiderToken = generateTestToken({ userId: outsider.id, email: outsider.email, role: 'member' });

      const res = await request(app)
        .post(`/api/v1/boards/${board.id}/lists`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ title: 'Unauthorized' });

      expect(res.status).toBe(403);
    });
  });

  // ─── UPDATE LIST ────────────────────────────────────────────────

  describe('PATCH /api/v1/lists/:id', () => {
    it('updates list title', async () => {
      const list = await createTestList(board.id, 'Old Title');

      const res = await request(app)
        .patch(`/api/v1/lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
    });

    it('rejects empty title update', async () => {
      const list = await createTestList(board.id, 'Keep Me');

      const res = await request(app)
        .patch(`/api/v1/lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE LIST ────────────────────────────────────────────────

  describe('DELETE /api/v1/lists/:id', () => {
    it('deletes list and all its cards', async () => {
      const list = await createTestList(board.id, 'Delete Me');
      await createTestCard(list.id, user.id, { title: 'Card 1' });
      await createTestCard(list.id, user.id, { title: 'Card 2' });

      const res = await request(app)
        .delete(`/api/v1/lists/${list.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const cards = await testPrisma.card.findMany({ where: { listId: list.id } });
      expect(cards.length).toBe(0);
    });

    it('rejects for non-board-member', async () => {
      const list = await createTestList(board.id, 'Protected');
      const outsider = await createTestUser({ email: 'outsider2@test.com' });
      const outsiderToken = generateTestToken({ userId: outsider.id, email: outsider.email, role: 'member' });

      const res = await request(app)
        .delete(`/api/v1/lists/${list.id}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── REORDER LISTS ──────────────────────────────────────────────

  describe('PATCH /api/v1/lists/reorder', () => {
    it('reorders lists by provided IDs', async () => {
      const list1 = await createTestList(board.id, 'A', 0);
      const list2 = await createTestList(board.id, 'B', 1);
      const list3 = await createTestList(board.id, 'C', 2);

      const res = await request(app)
        .patch('/api/v1/lists/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderedIds: [list3.id, list1.id, list2.id] });

      expect(res.status).toBe(200);

      const lists = await testPrisma.list.findMany({
        where: { boardId: board.id },
        orderBy: { position: 'asc' },
      });
      expect(lists[0].id).toBe(list3.id);
      expect(lists[1].id).toBe(list1.id);
      expect(lists[2].id).toBe(list2.id);
    });

    it('rejects empty orderedIds array', async () => {
      const res = await request(app)
        .patch('/api/v1/lists/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderedIds: [] });

      expect(res.status).toBe(400);
    });
  });
});

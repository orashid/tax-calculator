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

describe('Comment Routes — Comprehensive', () => {
  let user: any;
  let token: string;
  let board: any;
  let list: any;
  let card: any;

  beforeEach(async () => {
    await cleanupTestData();
    user = await createTestUser({ email: 'comment-user@test.com' });
    token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });
    board = await createTestBoard(user.id);
    list = await createTestList(board.id, 'List');
    card = await createTestCard(list.id, user.id);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  // ─── CREATE COMMENT ─────────────────────────────────────────────

  describe('POST /api/v1/cards/:cardId/comments', () => {
    it('creates a comment', async () => {
      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Great idea!' });

      expect(res.status).toBe(201);
      expect(res.body.body).toBe('Great idea!');
      expect(res.body.authorId).toBe(user.id);
    });

    it('creates a threaded reply', async () => {
      const parent = await testPrisma.comment.create({
        data: { cardId: card.id, authorId: user.id, body: 'Parent' },
      });

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Reply', parentId: parent.id });

      expect(res.status).toBe(201);
      expect(res.body.parentId).toBe(parent.id);
    });

    it('rejects empty body', async () => {
      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: '' });

      expect(res.status).toBe(400);
    });

    it('rejects body over 10000 chars', async () => {
      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'A'.repeat(10001) });

      expect(res.status).toBe(400);
    });

    it('accepts body at exactly 10000 chars', async () => {
      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'A'.repeat(10000) });

      expect(res.status).toBe(201);
    });

    it('rejects parentId that belongs to a different card', async () => {
      const card2 = await createTestCard(list.id, user.id, { title: 'Other Card' });
      const parentOnCard2 = await testPrisma.comment.create({
        data: { cardId: card2.id, authorId: user.id, body: 'On other card' },
      });

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Reply to wrong card', parentId: parentOnCard2.id });

      expect([400, 404]).toContain(res.status);
    });

    it('rejects nonexistent parentId', async () => {
      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Ghost parent', parentId: '00000000-0000-0000-0000-000000000000' });

      expect([400, 404]).toContain(res.status);
    });
  });

  // ─── LIST COMMENTS ──────────────────────────────────────────────

  describe('GET /api/v1/cards/:cardId/comments', () => {
    it('returns comments for a card', async () => {
      await testPrisma.comment.createMany({
        data: [
          { cardId: card.id, authorId: user.id, body: 'First' },
          { cardId: card.id, authorId: user.id, body: 'Second' },
        ],
      });

      const res = await request(app)
        .get(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array for card with no comments', async () => {
      const res = await request(app)
        .get(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ─── UPDATE COMMENT ─────────────────────────────────────────────

  describe('PATCH /api/v1/comments/:id', () => {
    it('author can update their comment', async () => {
      const comment = await testPrisma.comment.create({
        data: { cardId: card.id, authorId: user.id, body: 'Original' },
      });

      const res = await request(app)
        .patch(`/api/v1/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.body).toBe('Updated');
    });

    it('rejects empty body update', async () => {
      const comment = await testPrisma.comment.create({
        data: { cardId: card.id, authorId: user.id, body: 'Original' },
      });

      const res = await request(app)
        .patch(`/api/v1/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: '' });

      expect(res.status).toBe(400);
    });

    it('rejects body over 10000 chars', async () => {
      const comment = await testPrisma.comment.create({
        data: { cardId: card.id, authorId: user.id, body: 'Original' },
      });

      const res = await request(app)
        .patch(`/api/v1/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'X'.repeat(10001) });

      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE COMMENT ─────────────────────────────────────────────

  describe('DELETE /api/v1/comments/:id', () => {
    it('returns 404 for nonexistent comment', async () => {
      const res = await request(app)
        .delete('/api/v1/comments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect([403, 404]).toContain(res.status);
    });
  });
});

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

describe('Card Routes', () => {
  let user: any;
  let token: string;
  let board: any;
  let list1: any;
  let list2: any;

  beforeEach(async () => {
    await cleanupTestData();
    user = await createTestUser({ email: 'carduser@test.com' });
    token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });
    board = await createTestBoard(user.id);
    list1 = await createTestList(board.id, 'Todo', 0);
    list2 = await createTestList(board.id, 'Done', 1);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  describe('POST /api/v1/lists/:listId/cards', () => {
    it('creates a card in a list', async () => {
      const res = await request(app)
        .post(`/api/v1/lists/${list1.id}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Review budget' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Review budget');
      expect(res.body.listId).toBe(list1.id);
      expect(res.body.position).toBe(0);
    });

    it('assigns incrementing positions', async () => {
      await request(app)
        .post(`/api/v1/lists/${list1.id}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Card 1' });

      const res = await request(app)
        .post(`/api/v1/lists/${list1.id}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Card 2' });

      expect(res.body.position).toBe(1);
    });

    it('accepts card with due date', async () => {
      const dueDate = '2026-04-20T10:00:00.000Z';
      const res = await request(app)
        .post(`/api/v1/lists/${list1.id}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Deadline card', dueDate });

      expect(res.status).toBe(201);
      expect(res.body.dueDate).toBeTruthy();
    });
  });

  describe('GET /api/v1/cards/:id', () => {
    it('returns card detail with comments and attachments', async () => {
      const card = await createTestCard(list1.id, user.id, { title: 'Detail card' });

      const res = await request(app)
        .get(`/api/v1/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Detail card');
      expect(res.body).toHaveProperty('assignees');
      expect(res.body).toHaveProperty('comments');
      expect(res.body).toHaveProperty('attachments');
    });
  });

  describe('PATCH /api/v1/cards/:id', () => {
    it('updates card title', async () => {
      const card = await createTestCard(list1.id, user.id);

      const res = await request(app)
        .patch(`/api/v1/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated title');
    });

    it('clears due date with null', async () => {
      const card = await createTestCard(list1.id, user.id, { dueDate: new Date() });

      const res = await request(app)
        .patch(`/api/v1/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dueDate: null });

      expect(res.status).toBe(200);
      expect(res.body.dueDate).toBeNull();
    });
  });

  describe('POST /api/v1/cards/:id/move', () => {
    it('moves card between lists', async () => {
      const card = await createTestCard(list1.id, user.id, { title: 'Moving card' });

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetListId: list2.id, position: 0 });

      expect(res.status).toBe(200);
      expect(res.body.listId).toBe(list2.id);
    });

    it('maintains position integrity when moving', async () => {
      const card1 = await createTestCard(list2.id, user.id, { title: 'Existing', position: 0 });
      const card2 = await createTestCard(list1.id, user.id, { title: 'Moving', position: 0 });

      await request(app)
        .post(`/api/v1/cards/${card2.id}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetListId: list2.id, position: 0 });

      // The existing card should have been shifted
      const existingCard = await testPrisma.card.findUnique({ where: { id: card1.id } });
      expect(existingCard!.position).toBe(1);
    });
  });

  describe('DELETE /api/v1/cards/:id', () => {
    it('deletes a card', async () => {
      const card = await createTestCard(list1.id, user.id);

      const res = await request(app)
        .delete(`/api/v1/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      const deleted = await testPrisma.card.findUnique({ where: { id: card.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('Card Assignees', () => {
    it('adds and removes assignee', async () => {
      const card = await createTestCard(list1.id, user.id);

      // Add assignee
      const addRes = await request(app)
        .post(`/api/v1/cards/${card.id}/assignees`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: user.id });

      expect(addRes.status).toBe(200);
      expect(addRes.body.assignees).toHaveLength(1);

      // Remove assignee
      const removeRes = await request(app)
        .delete(`/api/v1/cards/${card.id}/assignees/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(removeRes.status).toBe(200);
    });

    it('rejects non-board-member as assignee', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const card = await createTestCard(list1.id, user.id);

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/assignees`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: otherUser.id });

      expect(res.status).toBe(400);
    });
  });
});

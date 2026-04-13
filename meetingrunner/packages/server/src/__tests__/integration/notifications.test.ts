import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../app.js';
import {
  testPrisma,
  createTestUser,
  generateTestToken,
  cleanupTestData,
} from '../helpers.js';

const app = createTestApp();

describe('Notification Routes — Comprehensive', () => {
  let user: any;
  let token: string;

  beforeEach(async () => {
    await cleanupTestData();
    user = await createTestUser({ email: 'notify@test.com' });
    token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  // ─── LIST NOTIFICATIONS ─────────────────────────────────────────

  describe('GET /api/v1/notifications', () => {
    it('returns empty array for user with no notifications', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns notifications ordered by unread first, then newest', async () => {
      await testPrisma.notification.createMany({
        data: [
          { userId: user.id, type: 'card_assigned', message: 'Read old', isRead: true, createdAt: new Date('2024-01-01') },
          { userId: user.id, type: 'card_assigned', message: 'Unread new', isRead: false, createdAt: new Date('2024-01-03') },
          { userId: user.id, type: 'card_assigned', message: 'Unread old', isRead: false, createdAt: new Date('2024-01-02') },
        ],
      });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3);
      // Unread first
      expect(res.body[0].isRead).toBe(false);
      expect(res.body[1].isRead).toBe(false);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });
  });

  // ─── UNREAD COUNT ───────────────────────────────────────────────

  describe('GET /api/v1/notifications/unread-count', () => {
    it('returns 0 when no unread notifications', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
    });

    it('counts only unread notifications', async () => {
      await testPrisma.notification.createMany({
        data: [
          { userId: user.id, type: 'card_assigned', message: 'N1', isRead: false },
          { userId: user.id, type: 'card_assigned', message: 'N2', isRead: false },
          { userId: user.id, type: 'card_assigned', message: 'N3', isRead: true },
        ],
      });

      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    });
  });

  // ─── MARK SINGLE READ ──────────────────────────────────────────

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('marks a single notification as read', async () => {
      const notification = await testPrisma.notification.create({
        data: { userId: user.id, type: 'card_assigned', message: 'Test', isRead: false },
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const updated = await testPrisma.notification.findUnique({ where: { id: notification.id } });
      expect(updated!.isRead).toBe(true);
    });

    it('is idempotent (marking already-read notification)', async () => {
      const notification = await testPrisma.notification.create({
        data: { userId: user.id, type: 'card_assigned', message: 'Already read', isRead: true },
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('returns 404 for nonexistent notification', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── MARK ALL READ ─────────────────────────────────────────────

  describe('POST /api/v1/notifications/read-all', () => {
    it('marks all notifications as read', async () => {
      await testPrisma.notification.createMany({
        data: [
          { userId: user.id, type: 'card_assigned', message: 'N1', isRead: false },
          { userId: user.id, type: 'card_assigned', message: 'N2', isRead: false },
          { userId: user.id, type: 'card_assigned', message: 'N3', isRead: false },
        ],
      });

      const res = await request(app)
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const countRes = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);

      expect(countRes.body.count).toBe(0);
    });

    it('is safe when no notifications exist', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('only marks current users notifications as read', async () => {
      const other = await createTestUser({ email: 'other-notify@test.com' });

      await testPrisma.notification.createMany({
        data: [
          { userId: user.id, type: 'card_assigned', message: 'Mine', isRead: false },
          { userId: other.id, type: 'card_assigned', message: 'Theirs', isRead: false },
        ],
      });

      await request(app)
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);

      const otherUnread = await testPrisma.notification.count({
        where: { userId: other.id, isRead: false },
      });
      expect(otherUnread).toBe(1);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../app.js';
import { testPrisma, createTestUser, cleanupTestData } from '../helpers.js';

const app = createTestApp();

describe('Auth Routes', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns tokens for valid credentials', async () => {
      await createTestUser({ email: 'login@test.com', password: 'testpass123' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@test.com', password: 'testpass123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe('login@test.com');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('returns 401 for wrong password', async () => {
      await createTestUser({ email: 'wrong@test.com', password: 'testpass123' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });

    it('returns 401 for nonexistent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'testpass123' });

      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-email', password: 'testpass123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'short' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rotates tokens on valid refresh', async () => {
      const user = await createTestUser({ email: 'refresh@test.com', password: 'testpass123' });

      // Login first
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'refresh@test.com', password: 'testpass123' });

      const { refreshToken } = loginRes.body;

      // Refresh
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.refreshToken).not.toBe(refreshToken); // Rotated

      // Old token should be invalidated
      const res2 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res2.status).toBe(401);
    });

    it('returns 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('invalidates all refresh tokens', async () => {
      const user = await createTestUser({ email: 'logout@test.com', password: 'testpass123' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'logout@test.com', password: 'testpass123' });

      const { accessToken, refreshToken } = loginRes.body;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);

      // Refresh token should no longer work
      const res2 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res2.status).toBe(401);
    });
  });
});

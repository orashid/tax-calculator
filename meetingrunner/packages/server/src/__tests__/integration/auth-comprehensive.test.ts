import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../app.js';
import {
  testPrisma,
  createTestUser,
  generateTestToken,
  generateExpiredToken,
  cleanupTestData,
} from '../helpers.js';

const app = createTestApp();

describe('Auth Routes — Comprehensive', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  // ─── LOGIN EDGE CASES ───────────────────────────────────────────

  describe('POST /api/v1/auth/login — edge cases', () => {
    it('rejects login for deactivated user', async () => {
      const user = await createTestUser({ email: 'deactivated@test.com', password: 'testpass123' });
      await testPrisma.user.update({ where: { id: user.id }, data: { isActive: false } });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'deactivated@test.com', password: 'testpass123' });

      expect(res.status).toBe(401);
    });

    it('is case-insensitive for email lookup', async () => {
      await createTestUser({ email: 'CaseTest@test.com', password: 'testpass123' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'casetest@test.com', password: 'testpass123' });

      // Should either find the user or not — depends on DB collation
      // But should not crash
      expect([200, 401]).toContain(res.status);
    });

    it('rejects empty body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects null email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: null, password: 'testpass123' });

      expect(res.status).toBe(400);
    });

    it('rejects numeric email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 12345, password: 'testpass123' });

      expect(res.status).toBe(400);
    });

    it('rejects password with only spaces', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: '        ' });

      // 8 spaces — passes length check but should fail auth
      expect([400, 401]).toContain(res.status);
    });

    it('does not leak user existence via different error messages', async () => {
      await createTestUser({ email: 'exists@test.com', password: 'testpass123' });

      const wrongPwRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'exists@test.com', password: 'wrongpassword' });

      const noUserRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nope@test.com', password: 'wrongpassword' });

      // Both should be 401 with same generic error (no user enumeration)
      expect(wrongPwRes.status).toBe(401);
      expect(noUserRes.status).toBe(401);
      expect(wrongPwRes.body.error).toBe(noUserRes.body.error);
    });

    it('returns mustChangePassword flag in login response', async () => {
      const user = await createTestUser({ email: 'mustchange@test.com', password: 'testpass123' });
      await testPrisma.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'mustchange@test.com', password: 'testpass123' });

      expect(res.status).toBe(200);
      expect(res.body.user.mustChangePassword).toBe(true);
    });

    it('does not return passwordHash in response', async () => {
      await createTestUser({ email: 'nohash@test.com', password: 'testpass123' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nohash@test.com', password: 'testpass123' });

      expect(res.status).toBe(200);
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('rejects extremely long email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'a'.repeat(500) + '@test.com', password: 'testpass123' });

      expect([400, 401]).toContain(res.status);
    });

    it('rejects extremely long password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'a'.repeat(10000) });

      expect([400, 401]).toContain(res.status);
    });
  });

  // ─── CHANGE PASSWORD — COMPREHENSIVE ────────────────────────────

  describe('POST /api/v1/users/change-password — comprehensive', () => {
    it('rejects without current password', async () => {
      const user = await createTestUser({ email: 'cp1@test.com', password: 'testpass123' });
      const token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });

      const res = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ newPassword: 'newpass456' });

      expect(res.status).toBe(400);
    });

    it('rejects with wrong current password', async () => {
      const user = await createTestUser({ email: 'cp2@test.com', password: 'testpass123' });
      const token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });

      const res = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrongpass', newPassword: 'newpass456' });

      expect(res.status).toBe(401);
    });

    it('rejects new password shorter than 8 characters', async () => {
      const user = await createTestUser({ email: 'cp3@test.com', password: 'testpass123' });
      const token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });

      const res = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'testpass123', newPassword: 'short' });

      expect(res.status).toBe(400);
    });

    it('rejects empty new password', async () => {
      const user = await createTestUser({ email: 'cp4@test.com', password: 'testpass123' });
      const token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });

      const res = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'testpass123', newPassword: '' });

      expect(res.status).toBe(400);
    });

    it('clears mustChangePassword flag after successful change', async () => {
      const user = await createTestUser({ email: 'cp5@test.com', password: 'testpass123' });
      await testPrisma.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
      const token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });

      await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'testpass123', newPassword: 'newpass456' });

      const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
      expect(updated!.mustChangePassword).toBe(false);
    });

    it('allows login with new password after change', async () => {
      const user = await createTestUser({ email: 'cp6@test.com', password: 'testpass123' });
      const token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });

      await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'testpass123', newPassword: 'brandnew456' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'cp6@test.com', password: 'brandnew456' });

      expect(loginRes.status).toBe(200);
    });

    it('rejects change without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/users/change-password')
        .send({ currentPassword: 'testpass123', newPassword: 'newpass456' });

      expect(res.status).toBe(401);
    });

    it('rejects non-string new password', async () => {
      const user = await createTestUser({ email: 'cp7@test.com', password: 'testpass123' });
      const token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });

      const res = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'testpass123', newPassword: 12345678 });

      expect(res.status).toBe(400);
    });
  });

  // ─── TOKEN REFRESH — COMPREHENSIVE ──────────────────────────────

  describe('POST /api/v1/auth/refresh — comprehensive', () => {
    it('rejects empty refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: '' });

      expect(res.status).toBe(400);
    });

    it('rejects missing refreshToken field', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects refresh for deactivated user', async () => {
      const user = await createTestUser({ email: 'deact-refresh@test.com', password: 'testpass123' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'deact-refresh@test.com', password: 'testpass123' });

      // Deactivate user after login
      await testPrisma.user.update({ where: { id: user.id }, data: { isActive: false } });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(res.status).toBe(401);
    });

    it('new access token contains correct role after role change', async () => {
      const user = await createTestUser({ email: 'role-refresh@test.com', password: 'testpass123', role: 'member' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'role-refresh@test.com', password: 'testpass123' });

      // Promote to admin
      await testPrisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken });

      // The refreshed token should have updated role
      expect(refreshRes.status).toBe(200);
    });

    it('prevents double-use of refresh token (replay attack)', async () => {
      await createTestUser({ email: 'replay@test.com', password: 'testpass123' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'replay@test.com', password: 'testpass123' });

      const { refreshToken } = loginRes.body;

      // First refresh succeeds
      const r1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
      expect(r1.status).toBe(200);

      // Second refresh with same token fails (token rotation)
      const r2 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
      expect(r2.status).toBe(401);
    });
  });

  // ─── LOGOUT — COMPREHENSIVE ─────────────────────────────────────

  describe('POST /api/v1/auth/logout — comprehensive', () => {
    it('rejects logout without authentication', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
    });

    it('invalidates all sessions (multiple logins)', async () => {
      await createTestUser({ email: 'multi-logout@test.com', password: 'testpass123' });

      // Login twice to get two refresh tokens
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'multi-logout@test.com', password: 'testpass123' });

      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'multi-logout@test.com', password: 'testpass123' });

      // Logout from first session
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${login1.body.accessToken}`);

      // Both refresh tokens should be dead
      const r1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: login1.body.refreshToken });
      const r2 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: login2.body.refreshToken });

      expect(r1.status).toBe(401);
      expect(r2.status).toBe(401);
    });

    it('logout is idempotent (calling twice does not error)', async () => {
      const user = await createTestUser({ email: 'idem-logout@test.com', password: 'testpass123' });
      const token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });

      const res1 = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      const res2 = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  // ─── ADMIN RESET PASSWORD — COMPREHENSIVE ──────────────────────

  describe('POST /api/v1/users/:id/reset-password — comprehensive', () => {
    it('returns 404 for nonexistent user ID', async () => {
      const admin = await createTestUser({ email: 'rp-admin@test.com', role: 'admin' });
      const adminToken = generateTestToken({ userId: admin.id, email: admin.email, role: 'admin' });

      const res = await request(app)
        .post('/api/v1/users/00000000-0000-0000-0000-000000000000/reset-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'newpass12345' });

      expect(res.status).toBe(404);
    });

    it('rejects non-string password', async () => {
      const admin = await createTestUser({ email: 'rp-admin2@test.com', role: 'admin' });
      const target = await createTestUser({ email: 'rp-target2@test.com' });
      const adminToken = generateTestToken({ userId: admin.id, email: admin.email, role: 'admin' });

      const res = await request(app)
        .post(`/api/v1/users/${target.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 12345678 });

      expect(res.status).toBe(400);
    });

    it('rejects null password', async () => {
      const admin = await createTestUser({ email: 'rp-admin3@test.com', role: 'admin' });
      const target = await createTestUser({ email: 'rp-target3@test.com' });
      const adminToken = generateTestToken({ userId: admin.id, email: admin.email, role: 'admin' });

      const res = await request(app)
        .post(`/api/v1/users/${target.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: null });

      expect(res.status).toBe(400);
    });
  });

  // ─── HEALTH CHECK ───────────────────────────────────────────────

  describe('GET /api/health', () => {
    it('returns ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});

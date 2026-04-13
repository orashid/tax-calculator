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

describe('User Management — Comprehensive', () => {
  let adminUser: any;
  let adminToken: string;

  beforeEach(async () => {
    await cleanupTestData();
    adminUser = await createTestUser({ email: 'admin@test.com', role: 'admin' });
    adminToken = generateTestToken({ userId: adminUser.id, email: adminUser.email, role: 'admin' });
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  // ─── LIST USERS ─────────────────────────────────────────────────

  describe('GET /api/v1/users', () => {
    it('returns all users ordered by displayName', async () => {
      await createTestUser({ email: 'alice@test.com', displayName: 'Alice' });
      await createTestUser({ email: 'bob@test.com', displayName: 'Bob' });

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3); // admin + alice + bob
      expect(res.body[0].displayName).toBe('Alice');
    });

    it('does not expose passwordHash', async () => {
      await createTestUser({ email: 'hash-check@test.com' });

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      res.body.forEach((u: any) => {
        expect(u).not.toHaveProperty('passwordHash');
      });
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET ME ─────────────────────────────────────────────────────

  describe('GET /api/v1/users/me', () => {
    it('returns current authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('admin@test.com');
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });

  // ─── INVITE USER ────────────────────────────────────────────────

  describe('POST /api/v1/users/invite', () => {
    it('creates user with mustChangePassword flag', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'newbie@test.com', displayName: 'Newbie' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('newbie@test.com');
      expect(res.body.user.mustChangePassword).toBe(true);
      expect(res.body).toHaveProperty('temporaryPassword');
      expect(res.body.temporaryPassword.length).toBeGreaterThan(0);
    });

    it('defaults role to member', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'default-role@test.com', displayName: 'Default' });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('member');
    });

    it('can create admin user', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new-admin@test.com', displayName: 'Admin2', role: 'admin' });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('admin');
    });

    it('rejects duplicate email', async () => {
      await createTestUser({ email: 'exists@test.com' });

      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'exists@test.com', displayName: 'Duplicate' });

      expect(res.status).toBe(409);
    });

    it('rejects invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'not-an-email', displayName: 'Invalid' });

      expect(res.status).toBe(400);
    });

    it('rejects empty displayName', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'empty-name@test.com', displayName: '' });

      expect(res.status).toBe(400);
    });

    it('rejects displayName over 100 chars', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'long-name@test.com', displayName: 'A'.repeat(101) });

      expect(res.status).toBe(400);
    });

    it('rejects invalid role', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'role@test.com', displayName: 'Bad Role', role: 'superadmin' });

      expect(res.status).toBe(400);
    });

    it('invited user can log in with temp password', async () => {
      const inviteRes = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'login-test@test.com', displayName: 'Login Test' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login-test@test.com', password: inviteRes.body.temporaryPassword });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
    });
  });

  // ─── DEACTIVATE / REACTIVATE ────────────────────────────────────

  describe('Deactivate / Reactivate', () => {
    it('deactivated user cannot log in', async () => {
      const user = await createTestUser({ email: 'deact@test.com', password: 'testpass123' });

      await request(app)
        .post(`/api/v1/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'deact@test.com', password: 'testpass123' });

      expect(loginRes.status).toBe(401);
    });

    it('deactivation clears all refresh tokens', async () => {
      const user = await createTestUser({ email: 'deact-tokens@test.com', password: 'testpass123' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'deact-tokens@test.com', password: 'testpass123' });

      await request(app)
        .post(`/api/v1/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(refreshRes.status).toBe(401);
    });

    it('reactivated user can log in again', async () => {
      const user = await createTestUser({ email: 'react@test.com', password: 'testpass123' });

      await request(app)
        .post(`/api/v1/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      await request(app)
        .post(`/api/v1/users/${user.id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'react@test.com', password: 'testpass123' });

      expect(loginRes.status).toBe(200);
    });

    it('deactivate returns updated user', async () => {
      const user = await createTestUser({ email: 'deact-res@test.com' });

      const res = await request(app)
        .post(`/api/v1/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });

    it('reactivate returns updated user', async () => {
      const user = await createTestUser({ email: 'react-res@test.com' });
      await testPrisma.user.update({ where: { id: user.id }, data: { isActive: false } });

      const res = await request(app)
        .post(`/api/v1/users/${user.id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(true);
    });
  });

  // ─── ROLE CHANGES ───────────────────────────────────────────────

  describe('Role Changes', () => {
    it('admin can change member to admin', async () => {
      const user = await createTestUser({ email: 'promote@test.com', role: 'member' });

      const res = await request(app)
        .patch(`/api/v1/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');
    });

    it('admin can demote admin to member', async () => {
      const user = await createTestUser({ email: 'demote@test.com', role: 'admin' });

      const res = await request(app)
        .patch(`/api/v1/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'member' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('member');
    });

    it('member cannot change own role', async () => {
      const member = await createTestUser({ email: 'self-promote@test.com', role: 'member' });
      const memberToken = generateTestToken({ userId: member.id, email: member.email, role: 'member' });

      await request(app)
        .patch(`/api/v1/users/${member.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'admin' });

      const updated = await testPrisma.user.findUnique({ where: { id: member.id } });
      expect(updated!.role).toBe('member');
    });
  });

  // ─── UPDATE PROFILE ─────────────────────────────────────────────

  describe('PATCH /api/v1/users/:id — profile updates', () => {
    it('user can update own displayName', async () => {
      const member = await createTestUser({ email: 'profile@test.com', displayName: 'Old Name' });
      const token = generateTestToken({ userId: member.id, email: member.email, role: 'member' });

      const res = await request(app)
        .patch(`/api/v1/users/${member.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('New Name');
    });

    it('user can clear avatarUrl with null', async () => {
      const member = await createTestUser({ email: 'avatar@test.com' });
      const token = generateTestToken({ userId: member.id, email: member.email, role: 'member' });

      const res = await request(app)
        .patch(`/api/v1/users/${member.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ avatarUrl: null });

      expect(res.status).toBe(200);
    });

    it('admin can update any user profile', async () => {
      const member = await createTestUser({ email: 'admin-edit@test.com', displayName: 'Old' });

      const res = await request(app)
        .patch(`/api/v1/users/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ displayName: 'Admin Changed It' });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('Admin Changed It');
    });

    it('rejects update to other user by non-admin', async () => {
      const user1 = await createTestUser({ email: 'user1@test.com' });
      const user2 = await createTestUser({ email: 'user2@test.com' });
      const user1Token = generateTestToken({ userId: user1.id, email: user1.email, role: 'member' });

      const res = await request(app)
        .patch(`/api/v1/users/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ displayName: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });
});

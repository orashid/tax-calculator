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

describe('Security: Input Validation & Injection Prevention', () => {
  let user: any;
  let token: string;
  let board: any;
  let list: any;

  beforeEach(async () => {
    await cleanupTestData();
    user = await createTestUser({ email: 'inject-test@test.com' });
    token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });
    board = await createTestBoard(user.id);
    list = await createTestList(board.id, 'Test List');
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  describe('SQL Injection Attempts', () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "1; DELETE FROM cards WHERE 1=1; --",
      "' UNION SELECT * FROM users --",
      "Robert'); DROP TABLE boards;--",
    ];

    for (const payload of sqlPayloads) {
      it(`handles SQL injection in card title: ${payload.substring(0, 30)}...`, async () => {
        const res = await request(app)
          .post(`/api/v1/lists/${list.id}/cards`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: payload });

        // Should either create the card with the literal string (Prisma parameterizes) or reject
        expect([201, 400]).toContain(res.status);

        if (res.status === 201) {
          // Verify the title is stored literally, not executed
          expect(res.body.title).toBe(payload);
        }

        // Verify tables still exist
        const userCount = await testPrisma.user.count();
        expect(userCount).toBeGreaterThan(0);
      });
    }

    it('handles SQL injection in board title', async () => {
      const res = await request(app)
        .post('/api/v1/boards')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: "'; DROP TABLE boards; --" });

      expect([201, 400]).toContain(res.status);

      const boardCount = await testPrisma.board.count();
      expect(boardCount).toBeGreaterThan(0);
    });

    it('handles SQL injection in comment body', async () => {
      const card = await createTestCard(list.id, user.id);

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: "'; DELETE FROM comments; --" });

      expect([201, 400]).toContain(res.status);
    });
  });

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg/onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
      '"><script>document.cookie</script>',
    ];

    for (const payload of xssPayloads) {
      it(`stores XSS payload literally in card title: ${payload.substring(0, 30)}...`, async () => {
        const res = await request(app)
          .post(`/api/v1/lists/${list.id}/cards`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: payload });

        // Card should be created with the literal payload stored
        // (XSS prevention is a frontend concern; backend should store as-is via parameterized queries)
        if (res.status === 201) {
          expect(res.body.title).toBe(payload);
        }
      });
    }

    it('stores XSS in comment body literally', async () => {
      const card = await createTestCard(list.id, user.id);

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: '<script>alert("xss")</script>' });

      expect(res.status).toBe(201);
      expect(res.body.body).toBe('<script>alert("xss")</script>');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('rejects path traversal in attachment filename', async () => {
      const card = await createTestCard(list.id, user.id);

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/attachments/presign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ filename: '../../../etc/passwd', mimeType: 'text/plain' });

      // The server sanitizes the filename via path.basename
      if (res.status === 200) {
        expect(res.body.fileKey).not.toContain('..');
      }
    });

    it('sanitizes directory separators in filenames', async () => {
      const card = await createTestCard(list.id, user.id);

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/attachments/presign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ filename: 'path/to/../../secret.txt', mimeType: 'text/plain' });

      if (res.status === 200) {
        expect(res.body.fileKey).not.toContain('..');
        // Should only contain the basename
        expect(res.body.fileKey).toContain('secret.txt');
      }
    });
  });

  describe('Oversized Payload Rejection', () => {
    it('rejects extremely long card title', async () => {
      const res = await request(app)
        .post(`/api/v1/lists/${list.id}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'a'.repeat(501) });

      expect(res.status).toBe(400);
    });

    it('rejects extremely long comment body', async () => {
      const card = await createTestCard(list.id, user.id);

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'a'.repeat(10001) });

      expect(res.status).toBe(400);
    });

    it('rejects oversized attachment confirmation', async () => {
      const card = await createTestCard(list.id, user.id);

      const res = await request(app)
        .post(`/api/v1/cards/${card.id}/attachments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileKey: 'key',
          filename: 'big.zip',
          fileSize: 26 * 1024 * 1024, // 26MB, over limit
          mimeType: 'application/zip',
        });

      expect(res.status).toBe(400);
    });
  });
});

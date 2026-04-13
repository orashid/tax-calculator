import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../app.js';
import {
  testPrisma,
  createTestUser,
  generateTestToken,
  cleanupTestData,
} from '../helpers.js';

// Note: import routes use their own express.json({ limit: '50mb' })
// but the test app uses 1mb limit — we test logic, not size limits here.

const app = createTestApp();

describe('Import Routes — Comprehensive', () => {
  let user: any;
  let token: string;

  beforeEach(async () => {
    await cleanupTestData();
    user = await createTestUser({ email: 'import-user@test.com' });
    token = generateTestToken({ userId: user.id, email: user.email, role: 'member' });
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  // ─── TRELLO JSON IMPORT ─────────────────────────────────────────

  describe('POST /api/v1/import/trello-json', () => {
    const validTrelloJson = {
      name: 'Test Board',
      desc: 'A test board',
      lists: [
        { id: 'list1', name: 'To Do', pos: 1, closed: false },
        { id: 'list2', name: 'Done', pos: 2, closed: false },
      ],
      cards: [
        { id: 'card1', name: 'Task 1', desc: 'Description', idList: 'list1', due: null, pos: 1, closed: false },
        { id: 'card2', name: 'Task 2', desc: '', idList: 'list2', due: '2024-12-31T00:00:00.000Z', pos: 1, closed: false },
      ],
      actions: [
        {
          type: 'commentCard',
          data: { text: 'A comment', card: { id: 'card1' } },
          date: '2024-06-15T10:30:00.000Z',
          memberCreator: { fullName: 'Alice' },
        },
      ],
    };

    it('imports a valid Trello board', async () => {
      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send(validTrelloJson);

      expect(res.status).toBe(201);
      expect(res.body.boardTitle).toBe('Test Board');
      expect(res.body.listsCreated).toBe(2);
      expect(res.body.cardsCreated).toBe(2);
      expect(res.body.commentsCreated).toBe(1);
      expect(res.body).toHaveProperty('boardId');
    });

    it('skips closed lists', async () => {
      const data = {
        ...validTrelloJson,
        lists: [
          ...validTrelloJson.lists,
          { id: 'list3', name: 'Archived', pos: 3, closed: true },
        ],
      };

      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.listsCreated).toBe(2); // Archived not counted
    });

    it('skips closed cards', async () => {
      const data = {
        ...validTrelloJson,
        cards: [
          ...validTrelloJson.cards,
          { id: 'card3', name: 'Closed Card', desc: '', idList: 'list1', due: null, pos: 2, closed: true },
        ],
      };

      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.cardsCreated).toBe(2); // Closed not counted
    });

    it('skips cards in closed lists', async () => {
      const data = {
        name: 'Board',
        desc: '',
        lists: [
          { id: 'l1', name: 'Open', pos: 1, closed: false },
          { id: 'l2', name: 'Closed', pos: 2, closed: true },
        ],
        cards: [
          { id: 'c1', name: 'In Open', desc: '', idList: 'l1', due: null, pos: 1, closed: false },
          { id: 'c2', name: 'In Closed', desc: '', idList: 'l2', due: null, pos: 1, closed: false },
        ],
      };

      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.cardsCreated).toBe(1);
    });

    it('handles board with no actions (no comments)', async () => {
      const data = {
        name: 'No Comments Board',
        desc: '',
        lists: [{ id: 'l1', name: 'List', pos: 1, closed: false }],
        cards: [{ id: 'c1', name: 'Card', desc: '', idList: 'l1', due: null, pos: 1, closed: false }],
      };

      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.commentsCreated).toBe(0);
    });

    it('handles empty lists and cards arrays', async () => {
      const data = {
        name: 'Empty Board',
        desc: '',
        lists: [],
        cards: [],
      };

      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.listsCreated).toBe(0);
      expect(res.body.cardsCreated).toBe(0);
    });

    it('rejects missing board name', async () => {
      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send({ desc: '', lists: [], cards: [] });

      expect(res.status).toBe(400);
    });

    it('rejects missing lists array', async () => {
      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', cards: [] });

      expect(res.status).toBe(400);
    });

    it('rejects missing cards array', async () => {
      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', lists: [] });

      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .send(validTrelloJson);

      expect(res.status).toBe(401);
    });

    it('adds the importing user as board member', async () => {
      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send(validTrelloJson);

      expect(res.status).toBe(201);

      const boardMember = await testPrisma.boardMember.findFirst({
        where: { boardId: res.body.boardId, userId: user.id },
      });
      expect(boardMember).not.toBeNull();
    });

    it('handles non-commentCard actions gracefully', async () => {
      const data = {
        ...validTrelloJson,
        actions: [
          { type: 'updateCard', data: { card: { id: 'card1' } }, date: '2024-01-01T00:00:00.000Z', memberCreator: { fullName: 'Bob' } },
          { type: 'createCard', data: { card: { id: 'card1' } }, date: '2024-01-01T00:00:00.000Z', memberCreator: { fullName: 'Bob' } },
        ],
      };

      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.commentsCreated).toBe(0);
    });

    it('imports card due dates correctly', async () => {
      const res = await request(app)
        .post('/api/v1/import/trello-json')
        .set('Authorization', `Bearer ${token}`)
        .send(validTrelloJson);

      expect(res.status).toBe(201);

      const cards = await testPrisma.card.findMany({
        where: { list: { board: { id: res.body.boardId } } },
        orderBy: { title: 'asc' },
      });

      const cardWithDue = cards.find((c) => c.title === 'Task 2');
      expect(cardWithDue?.dueDate).toBeTruthy();
    });
  });

  // ─── TRELLO CSV IMPORT ──────────────────────────────────────────

  describe('POST /api/v1/import/trello-csv', () => {
    it('imports a valid CSV', async () => {
      const csvData = [
        'Card Name,List Name,Description,Due',
        'Task 1,To Do,A task,2024-12-31',
        'Task 2,To Do,Another task,',
        'Task 3,Done,Complete,2024-11-15',
      ].join('\n');

      const res = await request(app)
        .post('/api/v1/import/trello-csv')
        .set('Authorization', `Bearer ${token}`)
        .send({ boardTitle: 'CSV Board', csvData });

      expect(res.status).toBe(201);
      expect(res.body.boardTitle).toBe('CSV Board');
      expect(res.body.listsCreated).toBe(2); // To Do + Done
      expect(res.body.cardsCreated).toBe(3);
    });

    it('rejects CSV without required columns', async () => {
      const csvData = 'Name,Status\nTask,Active';

      const res = await request(app)
        .post('/api/v1/import/trello-csv')
        .set('Authorization', `Bearer ${token}`)
        .send({ boardTitle: 'Bad CSV', csvData });

      expect(res.status).toBe(400);
    });

    it('rejects empty board title', async () => {
      const res = await request(app)
        .post('/api/v1/import/trello-csv')
        .set('Authorization', `Bearer ${token}`)
        .send({ boardTitle: '', csvData: 'Card Name,List Name\nTask,List' });

      expect(res.status).toBe(400);
    });

    it('rejects empty csvData', async () => {
      const res = await request(app)
        .post('/api/v1/import/trello-csv')
        .set('Authorization', `Bearer ${token}`)
        .send({ boardTitle: 'Test', csvData: '' });

      expect(res.status).toBe(400);
    });

    it('handles CSV with quoted fields', async () => {
      const csvData = [
        'Card Name,List Name,Description',
        '"Task with, comma",To Do,"Description with ""quotes"""',
      ].join('\n');

      const res = await request(app)
        .post('/api/v1/import/trello-csv')
        .set('Authorization', `Bearer ${token}`)
        .send({ boardTitle: 'Quoted CSV', csvData });

      expect(res.status).toBe(201);
      expect(res.body.cardsCreated).toBe(1);
    });

    it('handles CSV with only headers (no data rows)', async () => {
      const csvData = 'Card Name,List Name';

      const res = await request(app)
        .post('/api/v1/import/trello-csv')
        .set('Authorization', `Bearer ${token}`)
        .send({ boardTitle: 'Empty CSV', csvData });

      // Should fail because no lists were created
      expect(res.status).toBe(400);
    });
  });
});

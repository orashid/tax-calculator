import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import type { ImportResult, TrelloBoard } from '@meetingrunner/shared';

interface ParsedCard {
  title: string;
  description: string | null;
  dueDate: string | null;
  position: number;
  trelloId: string;
  trelloListId: string;
}

interface ParsedList {
  title: string;
  position: number;
  trelloId: string;
}

interface ParsedComment {
  body: string;
  trelloCardId: string;
  authorName: string;
  createdAt: string;
}

interface ParsedImport {
  boardTitle: string;
  boardDescription: string | null;
  lists: ParsedList[];
  cards: ParsedCard[];
  comments: ParsedComment[];
}

export function parseTrelloJson(data: TrelloBoard): ParsedImport {
  const lists = data.lists
    .filter((l) => !l.closed)
    .sort((a, b) => a.pos - b.pos)
    .map((l, i) => ({
      title: l.name.slice(0, 200),
      position: i,
      trelloId: l.id,
    }));

  const activeListIds = new Set(lists.map((l) => l.trelloId));

  const cards = data.cards
    .filter((c) => !c.closed && activeListIds.has(c.idList))
    .sort((a, b) => a.pos - b.pos)
    .map((c, i) => ({
      title: c.name.slice(0, 500),
      description: c.desc || null,
      dueDate: c.due || null,
      position: i,
      trelloId: c.id,
      trelloListId: c.idList,
    }));

  const comments = (data.actions || [])
    .filter((a) => {
      const d = a.data as Record<string, unknown>;
      return a.type === 'commentCard' && typeof d.text === 'string' && d.card && typeof (d.card as Record<string, unknown>).id === 'string';
    })
    .map((a) => {
      const d = a.data as Record<string, unknown>;
      const card = d.card as Record<string, unknown>;
      return {
        body: d.text as string,
        trelloCardId: card.id as string,
        authorName: a.memberCreator?.fullName || 'Unknown',
        createdAt: a.date,
      };
    });

  return {
    boardTitle: data.name.slice(0, 200),
    boardDescription: data.desc || null,
    lists,
    cards,
    comments,
  };
}

export function parseTrelloCsv(csvData: string, boardTitle: string): ParsedImport {
  const lines = csvData.split('\n');
  if (lines.length < 2) {
    return { boardTitle, boardDescription: null, lists: [], cards: [], comments: [] };
  }

  const headers = parseCSVLine(lines[0]);
  const nameIdx = headers.findIndex((h) => h.toLowerCase().includes('card name') || h.toLowerCase() === 'name');
  const listIdx = headers.findIndex((h) => h.toLowerCase().includes('list name') || h.toLowerCase() === 'list');
  const descIdx = headers.findIndex((h) => h.toLowerCase().includes('description') || h.toLowerCase() === 'desc');
  const dueIdx = headers.findIndex((h) => h.toLowerCase().includes('due'));

  if (nameIdx === -1 || listIdx === -1) {
    throw new Error('CSV must have "Card Name" and "List Name" columns');
  }

  const listMap = new Map<string, number>();
  const lists: ParsedList[] = [];
  const cards: ParsedCard[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    const cardName = cols[nameIdx]?.trim();
    const listName = cols[listIdx]?.trim();
    if (!cardName || !listName) continue;

    if (!listMap.has(listName)) {
      listMap.set(listName, lists.length);
      lists.push({ title: listName.slice(0, 200), position: lists.length, trelloId: `csv-list-${lists.length}` });
    }

    cards.push({
      title: cardName.slice(0, 500),
      description: descIdx >= 0 ? cols[descIdx]?.trim() || null : null,
      dueDate: dueIdx >= 0 && cols[dueIdx]?.trim() ? new Date(cols[dueIdx].trim()).toISOString() : null,
      position: cards.length,
      trelloId: `csv-card-${i}`,
      trelloListId: `csv-list-${listMap.get(listName)}`,
    });
  }

  return { boardTitle, boardDescription: null, lists, cards, comments: [] };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function executeImport(parsed: ParsedImport, userId: string): Promise<ImportResult> {
  const errors: string[] = [];
  let commentsCreated = 0;

  const result = await prisma.$transaction(async (tx) => {
    // Create board
    const board = await tx.board.create({
      data: {
        title: parsed.boardTitle,
        description: parsed.boardDescription,
        createdBy: userId,
        members: { create: { userId } },
      },
    });

    // Create lists
    const trelloToListId = new Map<string, string>();
    for (const list of parsed.lists) {
      const created = await tx.list.create({
        data: { boardId: board.id, title: list.title, position: list.position },
      });
      trelloToListId.set(list.trelloId, created.id);
    }

    // Create cards
    const trelloToCardId = new Map<string, string>();
    // Group cards by list for proper positioning
    const cardsByList = new Map<string, typeof parsed.cards>();
    for (const card of parsed.cards) {
      const listId = trelloToListId.get(card.trelloListId);
      if (!listId) {
        errors.push(`Skipped card "${card.title}": list not found`);
        continue;
      }
      if (!cardsByList.has(card.trelloListId)) cardsByList.set(card.trelloListId, []);
      cardsByList.get(card.trelloListId)!.push(card);
    }

    for (const [trelloListId, cards] of cardsByList) {
      const listId = trelloToListId.get(trelloListId)!;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const descriptionJson = card.description
          ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: card.description }] }] }
          : Prisma.JsonNull;
        const created = await tx.card.create({
          data: {
            listId,
            title: card.title,
            description: descriptionJson,
            position: i,
            dueDate: card.dueDate ? new Date(card.dueDate) : null,
            createdBy: userId,
          },
        });
        trelloToCardId.set(card.trelloId, created.id);
      }
    }

    // Create comments
    for (const comment of parsed.comments) {
      const cardId = trelloToCardId.get(comment.trelloCardId);
      if (!cardId) continue;
      await tx.comment.create({
        data: {
          cardId,
          authorId: userId,
          body: `[${comment.authorName}]: ${comment.body}`,
          createdAt: new Date(comment.createdAt),
        },
      });
      commentsCreated++;
    }

    return board;
  });

  return {
    boardId: result.id,
    boardTitle: result.title,
    listsCreated: parsed.lists.length,
    cardsCreated: parsed.cards.length - errors.length,
    commentsCreated,
    errors,
  };
}

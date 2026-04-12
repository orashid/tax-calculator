import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBoardStore } from '../stores/boardStore.js';
import { useNotificationStore } from '../stores/notificationStore.js';
import type { ListWithCards, CardSummary, User, Notification } from '@meetingrunner/shared';

// Mock API
vi.mock('../api/client.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const makeUser = (id: string, name: string): User => ({
  id,
  email: `${name.toLowerCase()}@test.com`,
  displayName: name,
  role: 'member',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makeCard = (id: string, listId: string, position: number): CardSummary => ({
  id,
  listId,
  title: `Card ${id}`,
  description: null,
  position,
  dueDate: null,
  createdBy: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  assignees: [],
  commentCount: 0,
  attachmentCount: 0,
});

const makeList = (id: string, boardId: string, position: number, cards: CardSummary[] = []): ListWithCards => ({
  id,
  boardId,
  title: `List ${id}`,
  position,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  cards,
});

describe('boardStore', () => {
  beforeEach(() => {
    useBoardStore.setState({
      board: null,
      isLoading: false,
      filterAssignee: null,
      sortByDueDate: false,
    });
  });

  it('adds a list to the board', () => {
    const store = useBoardStore.getState();
    useBoardStore.setState({
      board: {
        id: 'board-1',
        title: 'Test Board',
        description: null,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lists: [],
        members: [],
      },
    });

    useBoardStore.getState().addList({
      id: 'list-1',
      boardId: 'board-1',
      title: 'New List',
      position: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(useBoardStore.getState().board!.lists).toHaveLength(1);
    expect(useBoardStore.getState().board!.lists[0].title).toBe('New List');
  });

  it('adds a card to a list', () => {
    const list = makeList('list-1', 'board-1', 0);
    useBoardStore.setState({
      board: {
        id: 'board-1',
        title: 'Test',
        description: null,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lists: [list],
        members: [],
      },
    });

    const card = makeCard('card-1', 'list-1', 0);
    useBoardStore.getState().addCard('list-1', card);

    expect(useBoardStore.getState().board!.lists[0].cards).toHaveLength(1);
  });

  it('moves a card between lists', () => {
    const card = makeCard('card-1', 'list-1', 0);
    const list1 = makeList('list-1', 'board-1', 0, [card]);
    const list2 = makeList('list-2', 'board-1', 1, []);

    useBoardStore.setState({
      board: {
        id: 'board-1',
        title: 'Test',
        description: null,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lists: [list1, list2],
        members: [],
      },
    });

    useBoardStore.getState().moveCard('card-1', 'list-1', 'list-2', 0);

    const state = useBoardStore.getState();
    expect(state.board!.lists[0].cards).toHaveLength(0); // Source list empty
    expect(state.board!.lists[1].cards).toHaveLength(1); // Target has card
    expect(state.board!.lists[1].cards[0].id).toBe('card-1');
  });

  it('removes a card from a list', () => {
    const card = makeCard('card-1', 'list-1', 0);
    const list = makeList('list-1', 'board-1', 0, [card]);

    useBoardStore.setState({
      board: {
        id: 'board-1',
        title: 'Test',
        description: null,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lists: [list],
        members: [],
      },
    });

    useBoardStore.getState().removeCard('list-1', 'card-1');
    expect(useBoardStore.getState().board!.lists[0].cards).toHaveLength(0);
  });

  it('reorders lists', () => {
    const list1 = makeList('list-1', 'board-1', 0);
    const list2 = makeList('list-2', 'board-1', 1);

    useBoardStore.setState({
      board: {
        id: 'board-1',
        title: 'Test',
        description: null,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lists: [list1, list2],
        members: [],
      },
    });

    useBoardStore.getState().reorderLists(['list-2', 'list-1']);

    const state = useBoardStore.getState();
    expect(state.board!.lists[0].id).toBe('list-2');
    expect(state.board!.lists[1].id).toBe('list-1');
  });

  it('sets filter by assignee', () => {
    useBoardStore.getState().setFilterAssignee('user-1');
    expect(useBoardStore.getState().filterAssignee).toBe('user-1');

    useBoardStore.getState().setFilterAssignee(null);
    expect(useBoardStore.getState().filterAssignee).toBeNull();
  });

  it('toggles sort by due date', () => {
    useBoardStore.getState().setSortByDueDate(true);
    expect(useBoardStore.getState().sortByDueDate).toBe(true);
  });
});

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isOpen: false,
    });
  });

  it('adds a notification and increments unread count', () => {
    const notification: Notification = {
      id: 'notif-1',
      userId: 'user-1',
      type: 'card_assigned',
      cardId: 'card-1',
      message: 'You were assigned',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    useNotificationStore.getState().addNotification(notification);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });

  it('toggles open state', () => {
    useNotificationStore.getState().setOpen(true);
    expect(useNotificationStore.getState().isOpen).toBe(true);

    useNotificationStore.getState().setOpen(false);
    expect(useNotificationStore.getState().isOpen).toBe(false);
  });
});

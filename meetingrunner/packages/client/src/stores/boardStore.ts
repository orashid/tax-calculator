import { create } from 'zustand';
import type { BoardWithDetails, CardSummary, List } from '@meetingrunner/shared';
import { api } from '../api/client.js';

interface BoardState {
  board: BoardWithDetails | null;
  isLoading: boolean;
  filterAssignee: string | null;
  sortByDueDate: boolean;

  loadBoard: (boardId: string) => Promise<void>;
  setFilterAssignee: (userId: string | null) => void;
  setSortByDueDate: (sort: boolean) => void;

  // Optimistic updates
  addList: (list: List) => void;
  updateList: (list: List) => void;
  removeList: (listId: string) => void;
  reorderLists: (orderedIds: string[]) => void;

  addCard: (listId: string, card: CardSummary) => void;
  updateCard: (card: CardSummary) => void;
  removeCard: (listId: string, cardId: string) => void;
  moveCard: (cardId: string, fromListId: string, toListId: string, position: number) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  isLoading: false,
  filterAssignee: null,
  sortByDueDate: false,

  loadBoard: async (boardId) => {
    set({ isLoading: true });
    try {
      const board = await api.get<BoardWithDetails>(`/boards/${boardId}`);
      set({ board, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setFilterAssignee: (userId) => set({ filterAssignee: userId }),
  setSortByDueDate: (sort) => set({ sortByDueDate: sort }),

  addList: (list) => {
    const board = get().board;
    if (!board) return;
    set({ board: { ...board, lists: [...board.lists, { ...list, cards: [] }] } });
  },

  updateList: (list) => {
    const board = get().board;
    if (!board) return;
    set({
      board: {
        ...board,
        lists: board.lists.map((l) => (l.id === list.id ? { ...l, ...list } : l)),
      },
    });
  },

  removeList: (listId) => {
    const board = get().board;
    if (!board) return;
    set({ board: { ...board, lists: board.lists.filter((l) => l.id !== listId) } });
  },

  reorderLists: (orderedIds) => {
    const board = get().board;
    if (!board) return;
    const listMap = new Map(board.lists.map((l) => [l.id, l]));
    const reordered = orderedIds.map((id, i) => ({ ...listMap.get(id)!, position: i }));
    set({ board: { ...board, lists: reordered } });
  },

  addCard: (listId, card) => {
    const board = get().board;
    if (!board) return;
    set({
      board: {
        ...board,
        lists: board.lists.map((l) =>
          l.id === listId ? { ...l, cards: [...l.cards, card] } : l,
        ),
      },
    });
  },

  updateCard: (card) => {
    const board = get().board;
    if (!board) return;
    set({
      board: {
        ...board,
        lists: board.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) => (c.id === card.id ? { ...c, ...card } : c)),
        })),
      },
    });
  },

  removeCard: (listId, cardId) => {
    const board = get().board;
    if (!board) return;
    set({
      board: {
        ...board,
        lists: board.lists.map((l) =>
          l.id === listId ? { ...l, cards: l.cards.filter((c) => c.id !== cardId) } : l,
        ),
      },
    });
  },

  moveCard: (cardId, fromListId, toListId, position) => {
    const board = get().board;
    if (!board) return;

    let movedCard: CardSummary | undefined;
    const newLists = board.lists.map((l) => {
      if (l.id === fromListId) {
        const card = l.cards.find((c) => c.id === cardId);
        if (card) movedCard = card;
        return { ...l, cards: l.cards.filter((c) => c.id !== cardId) };
      }
      return l;
    });

    if (!movedCard) return;

    const finalLists = newLists.map((l) => {
      if (l.id === toListId) {
        const newCards = [...l.cards];
        newCards.splice(position, 0, { ...movedCard!, listId: toListId, position });
        return { ...l, cards: newCards };
      }
      return l;
    });

    set({ board: { ...board, lists: finalLists } });
  },
}));

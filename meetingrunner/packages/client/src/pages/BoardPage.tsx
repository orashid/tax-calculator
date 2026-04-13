import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useBoardStore } from '../stores/boardStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { api } from '../api/client.js';
import BoardColumn from '../components/BoardColumn.js';
import CardThumbnail from '../components/CardThumbnail.js';
import FilterBar from '../components/FilterBar.js';
import CardModal from '../components/CardModal.js';
import type { CardSummary } from '@meetingrunner/shared';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { board, isLoading, loadBoard, filterAssignee, sortByDueDate, moveCard } = useBoardStore();
  const [activeCard, setActiveCard] = useState<CardSummary | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useSocket(id);

  useEffect(() => {
    if (id) loadBoard(id);
  }, [id, loadBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'card') {
      setActiveCard(active.data.current.card);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by dnd-kit
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !board) return;

    const activeType = active.data.current?.type;
    if (activeType !== 'card') return;

    const cardId = active.id as string;
    const sourceListId = active.data.current?.listId;

    let targetListId: string;
    let targetPosition: number;

    if (over.data.current?.type === 'card') {
      targetListId = over.data.current.listId;
      targetPosition = over.data.current.index;
    } else if (over.data.current?.type === 'column') {
      targetListId = over.id as string;
      const targetList = board.lists.find((l) => l.id === targetListId);
      targetPosition = targetList?.cards.length || 0;
    } else {
      return;
    }

    if (sourceListId === targetListId && active.data.current?.index === targetPosition) return;

    moveCard(cardId, sourceListId, targetListId, targetPosition);

    try {
      await api.post(`/cards/${cardId}/move`, { targetListId, position: targetPosition });
    } catch {
      if (id) loadBoard(id);
    }
  };

  if (isLoading || !board) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading board...
        </div>
      </div>
    );
  }

  const handleDeleteBoard = async () => {
    if (!confirm(`Delete "${board.title}" and all its lists, cards, and comments? This cannot be undone.`)) return;
    try {
      await api.delete(`/boards/${board.id}`);
      navigate('/');
    } catch {
      // Error handled
    }
  };

  const filteredLists = board.lists.map((list) => {
    let cards = [...list.cards];

    if (filterAssignee) {
      cards = cards.filter((c) => c.assignees.some((a) => a.id === filterAssignee));
    }

    if (sortByDueDate) {
      cards.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }

    return { ...list, cards };
  });

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-50">
      <div className="px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{board.title}</h1>
            <span className="text-xs bg-indigo-100 text-indigo-600 px-2.5 py-0.5 rounded-full font-semibold">
              {board.lists.length} lists
            </span>
          </div>
          <div className="flex items-center gap-3">
            <FilterBar members={board.members} />
            <button
              onClick={handleDeleteBoard}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Delete board"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto p-6 board-columns">
          <div className="flex gap-4 items-start h-full">
            <SortableContext items={filteredLists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
              {filteredLists.map((list) => (
                <BoardColumn
                  key={list.id}
                  list={list}
                  boardId={board.id}
                  onCardClick={(cardId) => setSelectedCardId(cardId)}
                />
              ))}
            </SortableContext>

            <AddListButton boardId={board.id} />
          </div>
        </div>

        <DragOverlay>
          {activeCard && <CardThumbnail card={activeCard} isDragging />}
        </DragOverlay>
      </DndContext>

      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          boardMembers={board.members}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  );
}

function AddListButton({ boardId }: { boardId: string }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const { addList } = useBoardStore();

  const handleAdd = async () => {
    if (!title.trim()) return;
    try {
      const list = await api.post<any>(`/boards/${boardId}/lists`, { title });
      addList(list);
      setTitle('');
      setIsAdding(false);
    } catch {
      // Error handled
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex-shrink-0 w-72 h-10 px-3 bg-white/40 hover:bg-white/60 backdrop-blur-sm rounded-xl text-sm text-gray-500 hover:text-indigo-600 text-left transition-all flex items-center gap-1.5 font-medium self-start"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add another list
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 p-3 bg-gray-100 rounded-xl self-start">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter list title..."
        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg mb-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') setIsAdding(false);
        }}
      />
      <div className="flex items-center gap-2">
        <button onClick={handleAdd} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Add list
        </button>
        <button
          onClick={() => setIsAdding(false)}
          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

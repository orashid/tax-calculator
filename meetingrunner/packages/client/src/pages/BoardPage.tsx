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
import BoardMembersModal from '../components/BoardMembersModal.js';
import type { CardSummary } from '@meetingrunner/shared';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { board, isLoading, loadBoard, filterAssignee, sortByDueDate, moveCard } = useBoardStore();
  const [activeCard, setActiveCard] = useState<CardSummary | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);

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
    <div className="h-full flex flex-col board-bg">
      <div className="px-6 py-2.5 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white">{board.title}</h1>
            {/* Member avatars */}
            <div className="flex -space-x-1.5 ml-2">
              {board.members.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="w-7 h-7 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center border-2 border-white/30 font-semibold"
                  title={m.displayName}
                >
                  {m.displayName.charAt(0).toUpperCase()}
                </div>
              ))}
              {board.members.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-gray-500/80 text-white text-xs flex items-center justify-center border-2 border-white/30 font-semibold">
                  +{board.members.length - 5}
                </div>
              )}
            </div>
            {/* Add/manage members button */}
            <button
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-1.5 ml-1 px-3 py-1.5 bg-white hover:bg-gray-100 rounded-lg text-indigo-700 text-sm font-semibold transition-colors shadow-sm"
              title="Add or manage board members"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              + Add Members
            </button>
          </div>
          <div className="flex items-center gap-2">
            <FilterBar members={board.members} />
            <button
              onClick={handleDeleteBoard}
              className="p-2 text-white/60 hover:text-red-300 hover:bg-white/10 rounded-lg transition-all"
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

      {showMembers && (
        <BoardMembersModal
          boardId={board.id}
          currentMembers={board.members}
          boardCreatedBy={board.createdBy}
          onClose={() => setShowMembers(false)}
          onMembersChanged={() => { if (id) loadBoard(id); }}
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
        className="flex-shrink-0 w-72 h-10 px-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm text-white/80 hover:text-white text-left transition-all flex items-center gap-1.5 font-medium self-start"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add another list
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 p-3 bg-gray-200/80 backdrop-blur-sm rounded-xl self-start">
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

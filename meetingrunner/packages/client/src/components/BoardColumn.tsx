import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import CardThumbnail from './CardThumbnail.js';
import { api } from '../api/client.js';
import { useBoardStore } from '../stores/boardStore.js';
import type { ListWithCards, CardSummary } from '@meetingrunner/shared';

interface BoardColumnProps {
  list: ListWithCards;
  boardId: string;
  onCardClick: (cardId: string) => void;
}

export default function BoardColumn({ list, boardId, onCardClick }: BoardColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { updateList, addCard, removeList } = useBoardStore();

  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: { type: 'column', listId: list.id },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSave = async () => {
    if (title.trim() && title !== list.title) {
      try {
        const updated = await api.patch<any>(`/lists/${list.id}`, { title });
        updateList(updated);
      } catch {
        setTitle(list.title);
      }
    }
    setIsEditing(false);
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    try {
      const card = await api.post<CardSummary>(`/lists/${list.id}/cards`, { title: newCardTitle });
      addCard(list.id, card);
      setNewCardTitle('');
      setIsAddingCard(false);
    } catch {
      // Error handled
    }
  };

  const handleDeleteList = async () => {
    const cardCount = list.cards.length;
    const message = cardCount > 0
      ? `Delete "${list.title}" and its ${cardCount} card${cardCount > 1 ? 's' : ''}? This cannot be undone.`
      : `Delete "${list.title}"? This cannot be undone.`;
    if (!confirm(message)) return;
    try {
      await api.delete(`/lists/${list.id}`);
      removeList(list.id);
    } catch {
      // Error handled
    }
    setShowMenu(false);
  };

  return (
    <div
      className={`flex-shrink-0 w-72 bg-gray-200/80 backdrop-blur-sm rounded-xl flex flex-col max-h-full ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      {/* Header */}
      <div className="p-3 pb-1 flex items-center justify-between">
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
            className="w-full px-2 py-1 font-semibold text-sm border rounded outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <>
            <h3
              onClick={() => setIsEditing(true)}
              className="font-semibold text-sm text-gray-700 cursor-pointer px-2 py-1 hover:bg-gray-200 rounded flex-1"
            >
              {list.title}
            </h3>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 px-1">{list.cards.length}</span>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  title="List actions"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="4" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="10" cy="16" r="1.5" />
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    <button
                      onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Rename list
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={handleDeleteList}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete list
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Card list */}
      <div ref={setNodeRef} className="overflow-y-auto px-3 pb-1 card-list min-h-[40px]">
        <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {list.cards.map((card, index) => (
            <CardThumbnail
              key={card.id}
              card={card}
              index={index}
              listId={list.id}
              onClick={() => onCardClick(card.id)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add card */}
      <div className="p-3 pt-1">
        {isAddingCard ? (
          <div>
            <textarea
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Enter a title for this card..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm bg-white"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard();
                }
                if (e.key === 'Escape') {
                  setNewCardTitle('');
                  setIsAddingCard(false);
                }
              }}
            />
            <div className="flex items-center gap-2 mt-2">
              <button onClick={handleAddCard} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Add card
              </button>
              <button
                onClick={() => { setNewCardTitle(''); setIsAddingCard(false); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200/70 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}

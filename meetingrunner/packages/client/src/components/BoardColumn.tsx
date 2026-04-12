import { useState } from 'react';
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
  const { updateList, addCard } = useBoardStore();

  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: { type: 'column', listId: list.id },
  });

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

  return (
    <div
      className={`flex-shrink-0 w-72 bg-gray-100 rounded-xl flex flex-col max-h-full ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      {/* Header */}
      <div className="p-3 pb-1">
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
          <div className="flex items-center justify-between">
            <h3
              onClick={() => setIsEditing(true)}
              className="font-semibold text-sm text-gray-700 cursor-pointer px-2 py-1 hover:bg-gray-200 rounded"
            >
              {list.title}
            </h3>
            <span className="text-xs text-gray-400 px-2">{list.cards.length}</span>
          </div>
        )}
      </div>

      {/* Card list */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-3 pb-1 card-list min-h-[40px]">
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
              placeholder="Enter card title..."
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard();
                }
              }}
            />
            <div className="flex gap-2 mt-1">
              <button onClick={handleAddCard} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Add card
              </button>
              <button onClick={() => setIsAddingCard(false)} className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-800">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 px-2 py-1.5 rounded transition-colors"
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}

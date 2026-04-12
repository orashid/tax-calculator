import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { format, isPast, differenceInDays } from 'date-fns';
import type { CardSummary } from '@meetingrunner/shared';

interface CardThumbnailProps {
  card: CardSummary;
  index?: number;
  listId?: string;
  isDragging?: boolean;
  onClick?: () => void;
}

export default function CardThumbnail({ card, index, listId, isDragging, onClick }: CardThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card, listId, index },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueDateColor = getDueDateColor(card.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        'bg-white rounded-lg shadow-sm border p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2',
      )}
    >
      <p className="text-sm font-medium text-gray-900 mb-2">{card.title}</p>

      <div className="flex items-center gap-2 flex-wrap">
        {card.dueDate && (
          <span
            className={clsx(
              'text-xs px-2 py-0.5 rounded font-medium',
              dueDateColor === 'red' && 'bg-red-100 text-red-700',
              dueDateColor === 'yellow' && 'bg-yellow-100 text-yellow-700',
              dueDateColor === 'green' && 'bg-green-100 text-green-700',
            )}
          >
            {format(new Date(card.dueDate), 'MMM d')}
          </span>
        )}

        {card.commentCount > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-0.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {card.commentCount}
          </span>
        )}

        {card.attachmentCount > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-0.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            {card.attachmentCount}
          </span>
        )}

        {card.assignees.length > 0 && (
          <div className="flex -space-x-1 ml-auto">
            {card.assignees.slice(0, 3).map((user) => (
              <div
                key={user.id}
                className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white font-medium"
                title={user.displayName}
              >
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            ))}
            {card.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center border-2 border-white font-medium">
                +{card.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getDueDateColor(dueDate: string | null): 'red' | 'yellow' | 'green' | null {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  if (isPast(date)) return 'red';
  const daysUntil = differenceInDays(date, new Date());
  if (daysUntil <= 3) return 'yellow';
  return 'green';
}

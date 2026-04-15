import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { format, isPast, differenceInDays } from 'date-fns';
import type { CardSummary } from '@meetingrunner/shared';

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
  const hasDescription = card.description && JSON.stringify(card.description) !== '{"type":"doc","content":[{"type":"paragraph"}]}';
  const hasMetadata = card.dueDate || hasDescription || card.commentCount > 0 || card.assignees.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        'bg-white rounded-lg shadow-sm border border-gray-200/80 mb-1.5 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group/card',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2',
      )}
    >
      {/* Card title */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-sm text-gray-800 leading-snug">{card.title}</p>
      </div>

      {/* Metadata row */}
      {hasMetadata && (
        <div className="px-3 pb-2 pt-0.5 flex items-center gap-1.5 flex-wrap">
          {/* Due date badge */}
          {card.dueDate && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium',
                dueDateColor === 'red' && 'bg-red-500 text-white',
                dueDateColor === 'yellow' && 'bg-yellow-400 text-yellow-900',
                dueDateColor === 'green' && 'bg-green-100 text-green-700',
              )}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {format(new Date(card.dueDate), 'MMM d')}
            </span>
          )}

          {/* Description indicator */}
          {hasDescription && (
            <span className="text-gray-400" title="Has description">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </span>
          )}

          {/* Comment count */}
          {card.commentCount > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {card.commentCount}
            </span>
          )}

          {/* Assignee avatars — pushed to the right */}
          {card.assignees.length > 0 && (
            <div className="flex -space-x-1.5 ml-auto">
              {card.assignees.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className={`w-6 h-6 rounded-full ${getAvatarColor(user.displayName)} text-white text-[10px] flex items-center justify-center border-2 border-white font-semibold`}
                  title={user.displayName}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              ))}
              {card.assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-[10px] flex items-center justify-center border-2 border-white font-semibold">
                  +{card.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      )}
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

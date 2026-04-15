import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { format } from 'date-fns';
import { api } from '../api/client.js';
import { useBoardStore } from '../stores/boardStore.js';
import type { CardDetail, User, Comment } from '@meetingrunner/shared';

interface CardModalProps {
  cardId: string;
  boardMembers: User[];
  onClose: () => void;
}

export default function CardModal({ cardId, boardMembers, onClose }: CardModalProps) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [commentText, setCommentText] = useState('');
  const { updateCard } = useBoardStore();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Add a description...' }),
    ],
    content: card?.description || '',
    onBlur: ({ editor }) => {
      const content = editor.getJSON();
      if (card && JSON.stringify(content) !== JSON.stringify(card.description)) {
        handleUpdate({ description: content });
      }
    },
  });

  useEffect(() => {
    loadCard();
  }, [cardId]);

  const loadCard = async () => {
    try {
      const data = await api.get<CardDetail>(`/cards/${cardId}`);
      setCard(data);
      setTitle(data.title);
      setDueDate(data.dueDate ? format(new Date(data.dueDate), "yyyy-MM-dd'T'HH:mm") : '');
      if (editor && data.description) {
        editor.commands.setContent(data.description);
      }
    } catch {
      onClose();
    }
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    try {
      const updated = await api.patch<any>(`/cards/${cardId}`, data);
      setCard((prev) => (prev ? { ...prev, ...updated } : prev));
      updateCard(updated);
    } catch {
      // revert
    }
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== card?.title) {
      handleUpdate({ title });
    }
  };

  const handleDueDateChange = (value: string) => {
    setDueDate(value);
    handleUpdate({ dueDate: value ? new Date(value).toISOString() : null });
  };

  const handleAddAssignee = async (userId: string) => {
    try {
      const updated = await api.post<any>(`/cards/${cardId}/assignees`, { userId });
      setCard((prev) => (prev ? { ...prev, assignees: updated.assignees } : prev));
      updateCard(updated);
    } catch {
      // already assigned
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    try {
      const updated = await api.delete(`/cards/${cardId}/assignees/${userId}`);
      loadCard();
    } catch {
      // Error handled
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await api.post(`/cards/${cardId}/comments`, { body: commentText });
      setCommentText('');
      loadCard();
    } catch {
      // Error handled
    }
  };

  const handleDeleteCard = async () => {
    if (!confirm('Delete this card?')) return;
    try {
      await api.delete(`/cards/${cardId}`);
      onClose();
    } catch {
      // Error handled
    }
  };

  if (!card) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl p-8">Loading...</div>
      </div>
    );
  }

  const unassignedMembers = boardMembers.filter(
    (m) => !card.assignees.some((a) => a.id === m.id),
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto pt-12 pb-12" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-xl font-bold text-gray-900 w-full outline-none border-b-2 border-transparent focus:border-blue-500 pb-1"
            />
            <button onClick={onClose} className="ml-4 p-1 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 mb-2">Description</h4>
              <div className="border rounded-lg">
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Comments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Comments ({card.comments?.length || 0})
              </h4>

              <div className="space-y-3 mb-4">
                {card.comments?.map((comment: Comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium flex-shrink-0">
                      {comment.author.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{comment.author.displayName}</span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.body}</p>
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                          {comment.replies.map((reply: Comment) => (
                            <div key={reply.id} className="flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center font-medium flex-shrink-0">
                                {reply.author.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-xs font-medium">{reply.author.displayName}</span>
                                <p className="text-sm text-gray-700">{reply.body}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="self-end px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Due Date */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 mb-1">Due Date</h4>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Assignees */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 mb-2">Assignees</h4>
              <div className="space-y-2 mb-2">
                {card.assignees.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{user.displayName}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveAssignee(user.id)}
                      className="text-gray-400 hover:text-red-500 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {unassignedMembers.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) handleAddAssignee(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full px-2 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
                  defaultValue=""
                >
                  <option value="">+ Add assignee</option>
                  {unassignedMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={handleDeleteCard}
              className="w-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 transition-colors"
            >
              Delete card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

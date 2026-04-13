import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/authStore.js';
import type { User } from '@meetingrunner/shared';

interface BoardMembersModalProps {
  boardId: string;
  currentMembers: User[];
  boardCreatedBy: string;
  onClose: () => void;
  onMembersChanged: () => void;
}

export default function BoardMembersModal({
  boardId,
  currentMembers,
  boardCreatedBy,
  onClose,
  onMembersChanged,
}: BoardMembersModalProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser } = useAuthStore();

  const isAdmin = currentUser?.role === 'admin';
  const isCreator = currentUser?.id === boardCreatedBy;
  const canRemove = isAdmin || isCreator;

  useEffect(() => {
    api.get<User[]>('/users').then(setAllUsers).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const memberIds = new Set(currentMembers.map((m) => m.id));
  const nonMembers = allUsers.filter((u) => !memberIds.has(u.id) && u.isActive);

  const handleAdd = async (userId: string) => {
    setError('');
    try {
      await api.post(`/boards/${boardId}/members`, { userId });
      onMembersChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRemove = async (userId: string) => {
    setError('');
    try {
      await api.delete(`/boards/${boardId}/members/${userId}`);
      onMembersChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold text-gray-900">Board Members</h3>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500">Add or remove users from this board.</p>
        </div>

        {error && (
          <div className="mx-6 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Members ({currentMembers.length})</h4>
          <div className="space-y-1.5 mb-5">
            {currentMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 text-white text-sm flex items-center justify-center font-semibold">
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {m.displayName}
                      {m.id === boardCreatedBy && (
                        <span className="ml-1.5 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">Owner</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </div>
                </div>
                {canRemove && m.id !== boardCreatedBy && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg font-medium transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {nonMembers.length > 0 && (
            <>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Add Members</h4>
              <div className="space-y-1.5 mb-4">
                {isLoading ? (
                  <p className="text-sm text-gray-400 py-2">Loading users...</p>
                ) : (
                  nonMembers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-300 text-white text-sm flex items-center justify-center font-semibold">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.displayName}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAdd(u.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {!isLoading && nonMembers.length === 0 && (
            <p className="text-sm text-gray-400 py-2 text-center">All users are already members of this board.</p>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

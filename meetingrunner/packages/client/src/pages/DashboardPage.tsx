import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import type { Board } from '@meetingrunner/shared';

export default function DashboardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Board[]>('/boards');
      setBoards(data);
    } catch {
      // Error handled by API client
    }
    setIsLoading(false);
  };

  const createBoard = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.post('/boards', { title: newTitle, description: newDescription || undefined });
      setNewTitle('');
      setNewDescription('');
      setShowCreate(false);
      await loadBoards();
    } catch {
      // Error handled by API client
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading boards...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Boards</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + New Board
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow border">
          <h3 className="font-semibold mb-3">Create New Board</h3>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Board title"
            className="w-full px-3 py-2 border rounded-lg mb-2 outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={createBoard} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {boards.map((board) => (
          <Link
            key={board.id}
            to={`/boards/${board.id}`}
            className="block p-4 bg-white rounded-lg shadow border hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 mb-1">{board.title}</h3>
            {board.description && (
              <p className="text-sm text-gray-500 line-clamp-2">{board.description}</p>
            )}
          </Link>
        ))}

        {boards.length === 0 && !showCreate && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No boards yet</p>
            <p>Create your first board to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

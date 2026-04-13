import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import TrelloImportPanel from '../components/TrelloImportPanel.js';
import type { Board } from '@meetingrunner/shared';

const BOARD_GRADIENTS = [
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-pink-400',
  'from-emerald-500 to-teal-400',
  'from-orange-500 to-amber-400',
  'from-rose-500 to-pink-400',
  'from-indigo-500 to-violet-400',
  'from-fuchsia-500 to-purple-400',
  'from-cyan-500 to-blue-400',
];

export default function DashboardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
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

  const handleDeleteBoard = async (boardId: string, boardTitle: string) => {
    if (!confirm(`Delete "${boardTitle}" and all its lists, cards, and comments? This cannot be undone.`)) return;
    try {
      await api.delete(`/boards/${boardId}`);
      await loadBoards();
    } catch {
      // Error handled by API client
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading boards...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Boards</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your meetings and action items</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import from Trello
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Board
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="mb-6 p-5 bg-white rounded-2xl shadow-lg border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">Create New Board</h3>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Board title"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl mb-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            autoFocus
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition-all"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={createBoard} className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold transition-all">
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-5 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {boards.map((board, index) => (
          <div
            key={board.id}
            className="group relative rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-1"
          >
            <Link
              to={`/boards/${board.id}`}
              className="block"
            >
              <div className={`h-24 bg-gradient-to-br ${BOARD_GRADIENTS[index % BOARD_GRADIENTS.length]} p-4 flex items-end`}>
                <h3 className="font-bold text-white text-lg drop-shadow-sm">{board.title}</h3>
              </div>
              <div className="p-4 bg-white">
                {board.description ? (
                  <p className="text-sm text-gray-500 line-clamp-2">{board.description}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No description</p>
                )}
              </div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteBoard(board.id, board.title);
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/20 hover:bg-red-500 text-white/70 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              title="Delete board"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}

        {boards.length === 0 && !showCreate && (
          <div className="col-span-full text-center py-16">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-1">No boards yet</p>
            <p className="text-gray-400">Create your first board to get started</p>
          </div>
        )}
      </div>

      {showImport && (
        <TrelloImportPanel onClose={() => { setShowImport(false); loadBoards(); }} />
      )}
    </div>
  );
}

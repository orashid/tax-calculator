import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import type { ImportResult } from '@meetingrunner/shared';

type ImportMode = 'json' | 'csv';

export default function TrelloImportPanel({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<ImportMode>('json');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [csvBoardTitle, setCsvBoardTitle] = useState('');
  const [preview, setPreview] = useState<{ name: string; lists: number; cards: number } | null>(null);
  const [fileData, setFileData] = useState<unknown>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setPreview(null);
    setFileData(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        if (mode === 'json') {
          const data = JSON.parse(text);
          if (!data.name || !Array.isArray(data.lists) || !Array.isArray(data.cards)) {
            setError('Invalid Trello JSON format. Please export your board from Trello as JSON.');
            return;
          }
          setPreview({
            name: data.name,
            lists: data.lists.filter((l: { closed: boolean }) => !l.closed).length,
            cards: data.cards.filter((c: { closed: boolean }) => !c.closed).length,
          });
          setFileData(data);
        } else {
          const lines = text.split('\n').filter((l) => l.trim());
          setPreview({
            name: csvBoardTitle || 'Imported Board',
            lists: 0,
            cards: Math.max(0, lines.length - 1),
          });
          setFileData(text);
        }
      } catch {
        setError('Failed to parse file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!fileData) return;
    setIsImporting(true);
    setError('');
    try {
      let importResult: ImportResult;
      if (mode === 'json') {
        importResult = await api.post<ImportResult>('/import/trello-json', fileData);
      } else {
        importResult = await api.post<ImportResult>('/import/trello-csv', {
          boardTitle: csvBoardTitle || 'Imported Board',
          csvData: fileData as string,
        });
      }
      setResult(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
    setIsImporting(false);
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Import Complete</h3>
              <p className="text-sm text-gray-500">{result.boardTitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-indigo-600">{result.listsCreated}</p>
              <p className="text-xs text-indigo-500 font-medium">Lists</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{result.cardsCreated}</p>
              <p className="text-xs text-purple-500 font-medium">Cards</p>
            </div>
            <div className="bg-pink-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-pink-600">{result.commentsCreated}</p>
              <p className="text-xs text-pink-500 font-medium">Comments</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-700 mb-1">Warnings ({result.errors.length})</p>
              <div className="max-h-24 overflow-y-auto text-xs text-amber-600 space-y-0.5">
                {result.errors.map((err, i) => <p key={i}>{err}</p>)}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/boards/${result.boardId}`)}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              Open Board
            </button>
            <button onClick={onClose} className="px-5 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Import from Trello</h3>
        <p className="text-sm text-gray-500 mb-5">Import boards, lists, and cards from a Trello export file.</p>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => { setMode('json'); setPreview(null); setFileData(null); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'json' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            JSON Export
          </button>
          <button
            onClick={() => { setMode('csv'); setPreview(null); setFileData(null); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'csv' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            CSV Export
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        {mode === 'csv' && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Board Name</label>
            <input
              type="text"
              value={csvBoardTitle}
              onChange={(e) => setCsvBoardTitle(e.target.value)}
              placeholder="My Imported Board"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>
        )}

        {/* File upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all mb-4"
        >
          <input
            ref={fileRef}
            type="file"
            accept={mode === 'json' ? '.json' : '.csv'}
            onChange={handleFileSelect}
            className="hidden"
          />
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-gray-500 font-medium">
            Click to select a {mode === 'json' ? 'Trello JSON' : 'CSV'} file
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'json'
              ? 'Export from Trello: Menu → More → Print and Export → Export as JSON'
              : 'Export from Trello: Menu → More → Print and Export → Export as CSV'}
          </p>
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-indigo-50 rounded-xl p-4 mb-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-900">{preview.name}</p>
              <p className="text-xs text-indigo-600">
                {preview.lists > 0 ? `${preview.lists} lists, ` : ''}{preview.cards} cards
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleImport}
            disabled={!fileData || isImporting}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

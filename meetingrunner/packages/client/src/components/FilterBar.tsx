import { useBoardStore } from '../stores/boardStore.js';
import type { User } from '@meetingrunner/shared';

interface FilterBarProps {
  members: User[];
}

export default function FilterBar({ members }: FilterBarProps) {
  const { filterAssignee, sortByDueDate, setFilterAssignee, setSortByDueDate } = useBoardStore();

  return (
    <div className="flex items-center gap-2">
      <select
        value={filterAssignee || ''}
        onChange={(e) => setFilterAssignee(e.target.value || null)}
        className="text-xs border border-white/20 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-white/30 bg-white/15 text-white backdrop-blur-sm [&>option]:text-gray-900"
      >
        <option value="">All members</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.displayName}
          </option>
        ))}
      </select>

      <button
        onClick={() => setSortByDueDate(!sortByDueDate)}
        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
          sortByDueDate
            ? 'bg-white/25 border-white/30 text-white'
            : 'bg-white/10 border-white/15 text-white/70 hover:bg-white/20 hover:text-white'
        }`}
      >
        <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        Due date
      </button>
    </div>
  );
}

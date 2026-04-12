import { useBoardStore } from '../stores/boardStore.js';
import type { User } from '@meetingrunner/shared';

interface FilterBarProps {
  members: User[];
}

export default function FilterBar({ members }: FilterBarProps) {
  const { filterAssignee, sortByDueDate, setFilterAssignee, setSortByDueDate } = useBoardStore();

  return (
    <div className="flex items-center gap-3">
      <select
        value={filterAssignee || ''}
        onChange={(e) => setFilterAssignee(e.target.value || null)}
        className="text-sm border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
          sortByDueDate
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
      >
        Sort by due date
      </button>
    </div>
  );
}

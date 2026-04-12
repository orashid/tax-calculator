import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const helpSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: `
## Getting Started

Welcome to **MeetingRunner** — a kanban board app built for running meeting agendas and tracking action items.

### Quick Start
1. **Create a Board** — Click "New Board" on the dashboard. Each board represents a meeting type (e.g., Staff Meeting, All Hands).
2. **Add Lists** — Click "+ Add another list" to create columns. Common setups include: Standing Agenda, Short Topics, Long Topics, Action Items.
3. **Create Cards** — Click "+ Add a card" at the bottom of any list to create an agenda item or action item.
4. **Invite Team Members** — Ask your admin to invite team members so they can collaborate on boards.
`,
  },
  {
    id: 'boards',
    title: 'Boards & Lists',
    content: `
## Boards & Lists

### Boards
- Each board represents a meeting type or project
- You can see all your boards on the dashboard
- Board creators and admins can manage board membership

### Lists (Columns)
- Lists are the vertical columns on your board
- Click on a list title to rename it
- Drag lists to reorder them
- Delete a list by clicking the list menu

### Common Board Layouts
**Staff Meeting:**
- Standing Agenda | Short Topics | Long Topics | Action Items | Completed

**Project Board:**
- Backlog | In Progress | Review | Done
`,
  },
  {
    id: 'cards',
    title: 'Cards',
    content: `
## Cards

Cards represent agenda items, action items, or tasks.

### Creating Cards
- Click "+ Add a card" at the bottom of any list
- Type a title and press Enter or click "Add card"

### Card Details
Click on a card to open its detail view where you can:
- **Edit Title** — Click the title to edit it
- **Add Description** — Use the rich text editor for detailed notes
- **Set Due Date** — Pick a date and time for the deadline
- **Assign Members** — Add team members responsible for this item
- **Add Comments** — Discuss the item with threaded comments
- **Attach Files** — Upload files related to this card

### Due Date Colors
- 🟢 **Green** — More than 3 days until due
- 🟡 **Yellow** — Due within 3 days
- 🔴 **Red** — Overdue
`,
  },
  {
    id: 'drag-and-drop',
    title: 'Drag & Drop',
    content: `
## Drag & Drop

### Moving Cards
- Click and hold a card, then drag it to another position
- You can move cards within the same list or between different lists
- Cards snap into position when dropped
- Changes are saved automatically and synced in real-time to other users

### Tips
- You need to drag at least 8 pixels before a drag starts (this prevents accidental drags when clicking)
- The card you're dragging will appear slightly rotated as visual feedback
- The target column highlights when you hover over it
`,
  },
  {
    id: 'filtering',
    title: 'Filtering & Sorting',
    content: `
## Filtering & Sorting

Use the filter bar at the top of the board to find specific cards.

### Filter by Assignee
- Select a member from the dropdown to show only their cards
- Select "All members" to clear the filter

### Sort by Due Date
- Click "Sort by due date" to order cards by their deadline within each column
- Cards without due dates appear at the bottom
- Click again to return to manual ordering
`,
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    content: `
## Collaboration

### Real-Time Updates
MeetingRunner updates in real-time. When a team member:
- Creates, moves, or edits a card — you see it instantly
- Adds a comment — it appears without refreshing
- Changes list order — the board updates live

### Notifications
- Click the bell icon to view your notifications
- You'll be notified when:
  - Someone assigns you to a card
  - Someone comments on a card you're assigned to
  - A card you're assigned to is approaching its due date
  - A card you're assigned to is overdue
- Click "Mark all read" to clear notification badges

### Board Members
- Board creators and admins can add/remove members
- Only board members can view and edit the board's content
`,
  },
  {
    id: 'user-management',
    title: 'User Management',
    content: `
## User Management

### Roles
- **Admin** — Can manage users (invite, update roles), manage all boards, and perform all actions
- **Member** — Can use boards they're added to, create cards, comment, and manage their own profile

### Inviting Users (Admin Only)
Admins can invite new users, who receive a temporary password to log in with.

### Updating Your Profile
- Click your name in the top-right corner
- You can update your display name and password
`,
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('getting-started');

  const filteredSections = search
    ? helpSections.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.content.toLowerCase().includes(search.toLowerCase()),
      )
    : helpSections;

  const currentSection = filteredSections.find((s) => s.id === activeSection) || filteredSections[0];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r p-4 overflow-y-auto flex-shrink-0">
        <h2 className="font-bold text-lg mb-4">Help</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search help..."
          className="w-full px-3 py-2 border rounded-lg text-sm mb-4 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <nav className="space-y-1">
          {filteredSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {section.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto prose prose-sm prose-blue">
          {currentSection ? (
            <ReactMarkdown>{currentSection.content}</ReactMarkdown>
          ) : (
            <p className="text-gray-500">No results found for "{search}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

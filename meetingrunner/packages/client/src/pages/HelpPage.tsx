import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '../stores/authStore.js';

interface HelpSection {
  id: string;
  title: string;
  content: string;
  role?: 'admin'; // if set, only visible to that role; if omitted, visible to all
}

const helpSections: HelpSection[] = [
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
- Any board member can add other users to the board; board creators and admins can also remove members
- Click the member avatars at the top of the board to open the member management panel
- **Delete a board** by hovering over it on the dashboard and clicking the trash icon
- Deleting a board permanently removes all its lists, cards, comments, and attachments

### Lists (Columns)
- Lists are the vertical columns on your board
- Click on a list title to rename it
- Drag lists to reorder them
- Click the **...** menu on any list header to rename or delete it
- Deleting a list permanently removes all cards within it

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
- **Delete Card** — Click the "Delete card" button at the bottom of the card sidebar

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
- Any board member can add other users to the board by clicking the member avatars at the top of the board
- Only the board creator or an admin can remove members from a board
- Only board members can view and edit the board's content
`,
  },
  {
    id: 'password',
    title: 'Password Management',
    content: `
## Password Management

### First Login
When you first receive your account (via invite) or after an admin resets your password, you will be required to change your password before you can continue. Enter the password provided by your administrator as your current password, then choose a new password (at least 8 characters). You cannot reuse your current password as your new password.

### Changing Your Password
1. Click your name in the top-right corner of the navigation bar
2. Select **Change Password** from the dropdown menu
3. Enter your current password and your new password
4. Click **Change Password** to save

### If You Need Your Password Reset
Contact an administrator — they can set a new password for you from the User Management page. You will then use that password to log in and will be immediately prompted to choose your own new password.
`,
  },
  {
    id: 'trello-import',
    title: 'Importing from Trello',
    content: `
## Importing from Trello

You can import existing boards from Trello using JSON or CSV export files.

### JSON Import (Recommended)
1. In Trello, go to the board you want to export
2. Click **Menu > More > Print and Export > Export as JSON**
3. In MeetingRunner, go to the **Dashboard**
4. Click **Import from Trello**
5. Select the **JSON** tab, then drag and drop your JSON file or click to browse
6. Preview the board name, list count, and card count
7. Click **Import Board** — your board will be created with all lists, cards, and comments

### CSV Import
1. In Trello, export your board as CSV
2. In MeetingRunner, click **Import from Trello** on the Dashboard
3. Select the **CSV** tab
4. Enter a board title, then paste or upload your CSV data
5. Click **Import Board**

### What Gets Imported
- Board name and description
- All open lists (closed/archived lists are skipped)
- All open cards with titles, descriptions, due dates, and positions
- Comments from Trello's action history
- Descriptions are converted to rich text format

### What Does NOT Get Imported
- Attachments (files are not transferred)
- Card labels/tags
- Checklists
- Board members (you'll need to add members manually)
`,
  },
  {
    id: 'user-management',
    title: 'User Management',
    role: 'admin',
    content: `
## User Management

### Roles
- **Admin** — Can manage users (invite, deactivate, reset passwords, update roles), manage all boards, and perform all actions
- **Member** — Can use boards they're added to, create cards, comment, and manage their own profile

### Inviting Users
1. Click your name in the top-right corner and select **User Management** from the dropdown
2. Click **Invite User**
3. Enter the user's display name, email, and role
4. A temporary password is generated — if SMTP email is configured, the user receives an invite email automatically
5. If email is not configured, copy the temporary password and share it securely with the user
6. The user will be required to **change their password on first login**

### Deactivating / Reactivating Users
- In the User Management page, click **Deactivate** next to a user to disable their account
- Deactivated users cannot log in and all their active sessions are terminated
- Click **Reactivate** to restore access
- User data is never deleted — deactivation is reversible

### Resetting Passwords
- In the User Management page, click **Reset Password** next to a user
- A dialog will appear where you enter a new password for the user
- The user's password is changed immediately and all their active sessions are terminated
- On their next login (using the password you set), they will be required to choose their own new password

### Changing Roles
- In the User Management page, use the role dropdown next to a user to switch between **admin** and **member**
- You cannot change your own role
`,
  },
  {
    id: 'admin-portal',
    title: 'Admin Portal',
    role: 'admin',
    content: `
## Admin Portal

The User Management page is accessible from the profile dropdown menu in the top-right corner (visible to admin users only).

### Dashboard Overview
- Total user count, active users, and admin count displayed at the top
- Searchable user table with name, email, role, and status

### Available Actions
| Action | Description |
|--------|-------------|
| **Invite User** | Create a new user account with a temporary password |
| **Change Role** | Switch a user between admin and member roles |
| **Deactivate** | Disable a user's account (reversible) |
| **Reactivate** | Re-enable a deactivated account |
| **Reset Password** | Set a new password for the user; they must change it on next login |

### Notes
- You cannot deactivate or change the role of your own account
- Deactivated users retain their data but cannot log in
- Password resets invalidate all active sessions for that user
`,
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('getting-started');
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const visibleSections = helpSections.filter((s) => !s.role || (s.role === 'admin' && isAdmin));

  const filteredSections = search
    ? visibleSections.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.content.toLowerCase().includes(search.toLowerCase()),
      )
    : visibleSections;

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

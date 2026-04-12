import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import NotificationBell from './NotificationBell.js';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
            MeetingRunner
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            Boards
          </Link>
          <Link to="/help" className="text-sm text-gray-500 hover:text-gray-700">
            Help
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-medium">
              {user?.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <span className="text-sm text-gray-700">{user?.displayName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-600 ml-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

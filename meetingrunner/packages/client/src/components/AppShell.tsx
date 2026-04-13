import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import NotificationBell from './NotificationBell.js';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white hover:opacity-90 transition-opacity">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            MeetingRunner
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`text-sm px-3 py-1.5 rounded-lg transition-all font-medium ${
                isActive('/') ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Boards
            </Link>
            <Link
              to="/help"
              className={`text-sm px-3 py-1.5 rounded-lg transition-all font-medium ${
                isActive('/help') ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Help
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`text-sm px-3 py-1.5 rounded-lg transition-all font-medium ${
                  isActive('/admin') ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="h-6 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 text-white text-sm flex items-center justify-center font-semibold ring-2 ring-white/30">
              {user?.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <span className="text-sm text-white/90 font-medium">{user?.displayName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-white/50 hover:text-white ml-1 transition-colors"
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

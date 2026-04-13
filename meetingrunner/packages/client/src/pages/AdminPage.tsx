import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import InviteUserModal from '../components/InviteUserModal.js';
import ResetPasswordModal from '../components/ResetPasswordModal.js';
import type { User } from '@meetingrunner/shared';
import { useAuthStore } from '../stores/authStore.js';

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; displayName: string } | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.get<User[]>('/users');
      setUsers(data);
    } catch {
      // handled
    }
    setIsLoading(false);
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    setActionLoading(userId);
    try {
      await api.patch(`/users/${userId}`, { role });
      await loadUsers();
    } catch {
      // handled
    }
    setActionLoading(null);
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    setActionLoading(userId);
    try {
      if (isActive) {
        await api.post(`/users/${userId}/deactivate`, {});
      } else {
        await api.post(`/users/${userId}/reactivate`, {});
      }
      await loadUsers();
    } catch {
      // handled
    }
    setActionLoading(null);
  };

  const handleResetPassword = (userId: string, displayName: string) => {
    setResetTarget({ id: userId, displayName });
  };

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading users...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} users total &middot; {activeCount} active &middot; {adminCount} admins
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg shadow-indigo-500/25 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite User
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* User table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-5 py-3">User</th>
              <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-5 py-3">Role</th>
              <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.map((user) => {
              const isSelf = user.id === currentUser?.id;
              const loading = actionLoading === user.id;
              return (
                <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors ${!user.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${getAvatarColor(user.displayName)} text-white text-sm flex items-center justify-center font-semibold shadow-sm`}>
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          {user.displayName}
                          {isSelf && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">You</span>}
                        </p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {isSelf ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role}
                      </span>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'member')}
                        disabled={loading}
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border-0 outline-none cursor-pointer ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!isSelf && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleResetPassword(user.id, user.displayName)}
                          disabled={loading}
                          className="text-xs px-2.5 py-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all font-medium disabled:opacity-40"
                          title="Reset password"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          disabled={loading}
                          className={`text-xs px-2.5 py-1.5 rounded-lg transition-all font-medium disabled:opacity-40 ${
                            user.isActive
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {user.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No users found matching "{search}"
          </div>
        )}
      </div>

      {showInvite && (
        <InviteUserModal
          onClose={() => setShowInvite(false)}
          onInvited={loadUsers}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          userId={resetTarget.id}
          displayName={resetTarget.displayName}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}

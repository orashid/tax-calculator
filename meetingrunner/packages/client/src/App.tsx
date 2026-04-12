import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore.js';
import AppShell from './components/AppShell.js';
import LoginPage from './pages/LoginPage.js';
import DashboardPage from './pages/DashboardPage.js';
import BoardPage from './pages/BoardPage.js';
import HelpPage from './pages/HelpPage.js';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) loadUser();
  }, [isAuthenticated, loadUser]);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/boards/:id"
        element={
          <ProtectedRoute>
            <BoardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <HelpPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

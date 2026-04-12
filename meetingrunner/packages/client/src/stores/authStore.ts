import { create } from 'zustand';
import type { User, LoginRequest, LoginResponse } from '@meetingrunner/shared';
import { api } from '../api/client.js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const data = await api.post<LoginResponse>('/auth/login', credentials);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    if (!localStorage.getItem('accessToken')) return;
    set({ isLoading: true });
    try {
      const user = await api.get<User>('/users/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; firstName: string; lastName: string; phone?: string; newsletter?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiClient.get<User>('/auth/me', { auth: true });
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<{ user: User }>('/auth/login', { email, password }, { csrf: true });
    setUser(res.user);
  }, []);

  const register = useCallback(async (input: { email: string; password: string; firstName: string; lastName: string; phone?: string; newsletter?: boolean }) => {
    const res = await apiClient.post<{ user: User }>('/auth/register', input, { csrf: true });
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout', undefined, { csrf: true });
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };

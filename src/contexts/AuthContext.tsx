import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  userId: string;
  username: string;
  email: string;
  hasStarter: boolean;
  profile: {
    displayName: string;
    avatarUrl?: string | null;
    coins?: number;
    level?: number;
  } | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

import { getAuthToken, clearAuthToken } from '../utils/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/auth/me', {
        headers,
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser({
            ...data.data,
            id: data.data.id || data.data.userId
          });
        } else {
          clearAuthToken();
          setUser(null);
        }
      } else {
        clearAuthToken();
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Failed to logout:', e);
    } finally {
      clearAuthToken();
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, checkAuth, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

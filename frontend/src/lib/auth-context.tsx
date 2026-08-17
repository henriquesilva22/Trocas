'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiFetch, getToken, setToken } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  avatarUrl: string | null;
  role: 'CUSTOMER' | 'TECHNICIAN' | 'ADMIN';
  pixKey: string | null;
  pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | null;
  trustScore: number;
  isBanned: boolean;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string; cpf?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    apiFetch<User>('/users/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.accessToken);
    setUser(data.user);
  }

  async function register(payload: { name: string; email: string; password: string; phone?: string; cpf?: string }) {
    const data = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(data.accessToken);
    setUser(data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const freshUser = await apiFetch<User>('/users/me');
    setUser(freshUser);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

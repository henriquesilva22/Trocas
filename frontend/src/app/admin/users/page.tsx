'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';

type Role = 'CUSTOMER' | 'TECHNICIAN' | 'ADMIN';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  isBanned: boolean;
}

interface ListResponse {
  items: AdminUserRow[];
  total: number;
}

const ROLES: Role[] = ['CUSTOMER', 'TECHNICIAN', 'ADMIN'];

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<ListResponse>('/admin/users?page=1&pageSize=50');
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os usuários');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') load();
  }, [authLoading, user, router, load]);

  async function handleSetRole(id: string, role: Role) {
    setError(null);
    setBusyId(id);
    try {
      await apiFetch(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível alterar a role');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleBan(id: string, isBanned: boolean) {
    setError(null);
    setBusyId(id);
    try {
      if (isBanned) {
        await apiFetch(`/admin/users/${id}/unban`, { method: 'PATCH' });
      } else {
        await apiFetch(`/admin/users/${id}/ban`, {
          method: 'PATCH',
          body: JSON.stringify({ reason: 'Banido via painel de administração' }),
        });
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível alterar o banimento');
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || !user) return <main className="px-8 py-16">Carregando...</main>;
  if (user.role !== 'ADMIN') {
    return <main className="px-8 py-16">Acesso restrito a administradores.</main>;
  }

  return (
    <main className="px-8 py-10">
      <h1 className="mb-2 text-2xl font-bold">Usuários</h1>
      <p className="mb-6 text-sm text-slate-600">
        Promova alguém a técnico (pra operar o Hub) ou admin, ou bana/desbana contas.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {items?.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 text-sm">
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-slate-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={u.role}
                disabled={busyId === u.id}
                onChange={(e) => handleSetRole(u.id, e.target.value as Role)}
                className="rounded border border-slate-300 px-2 py-1"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleToggleBan(u.id, u.isBanned)}
                disabled={busyId === u.id}
                className={`rounded px-3 py-1 text-white disabled:opacity-50 ${u.isBanned ? 'bg-green-700' : 'bg-red-700'}`}
              >
                {u.isBanned ? 'Desbanir' : 'Banir'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

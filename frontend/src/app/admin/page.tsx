'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { formatBRL } from '@/lib/catalog';

interface DashboardStats {
  usersCount: number;
  productsCount: number;
  negotiationsInProgress: number;
  negotiationsFinalized: number;
  platformRevenue: number;
  inspectionsCount: number;
  disputesCount: number;
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') {
      apiFetch<DashboardStats>('/admin/dashboard')
        .then(setStats)
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar'));
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) return <main className="px-8 py-16">Carregando...</main>;
  if (user.role !== 'ADMIN') return <main className="px-8 py-16">Acesso restrito a administradores.</main>;

  return (
    <main className="px-8 py-10">
      <h1 className="mb-1 text-2xl font-bold">Admin Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">Hoje</p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!stats ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Usuários cadastrados" value={stats.usersCount} />
          <StatCard label="Produtos publicados" value={stats.productsCount} />
          <StatCard label="Trocas em andamento" value={stats.negotiationsInProgress} />
          <StatCard label="Trocas concluídas" value={stats.negotiationsFinalized} />
          <StatCard label="Receita de intermediação" value={formatBRL(stats.platformRevenue)} />
          <StatCard label="Inspeções" value={stats.inspectionsCount} />
          <StatCard label="Disputas" value={stats.disputesCount} />
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

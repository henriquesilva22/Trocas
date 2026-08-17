'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { NEGOTIATION_STATUS_LABEL, NegotiationStatus } from '@/lib/negotiations';

interface AdminNegotiationRow {
  id: string;
  status: NegotiationStatus;
  amount: string;
  product: { title: string };
  offeredProduct: { title: string } | null;
}

interface ListResponse {
  items: AdminNegotiationRow[];
  total: number;
}

const STATUSES = Object.keys(NEGOTIATION_STATUS_LABEL) as NegotiationStatus[];

export default function AdminNegotiationsPage() {
  return (
    <Suspense fallback={<main className="px-8 py-16">Carregando...</main>}>
      <AdminNegotiationsPageInner />
    </Suspense>
  );
}

function AdminNegotiationsPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? '';

  const [items, setItems] = useState<AdminNegotiationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ page: '1', pageSize: '50' });
      if (status) qs.set('status', status);
      const data = await apiFetch<ListResponse>(`/admin/negotiations?${qs.toString()}`);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as negociações');
    }
  }, [status]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') load();
  }, [authLoading, user, router, load]);

  function handleStatusChange(value: string) {
    router.push(value ? `/admin/negotiations?status=${value}` : '/admin/negotiations');
  }

  if (authLoading || !user) return <main className="px-8 py-16">Carregando...</main>;
  if (user.role !== 'ADMIN') {
    return <main className="px-8 py-16">Acesso restrito a administradores.</main>;
  }

  return (
    <main className="px-8 py-10">
      <h1 className="mb-2 text-2xl font-bold">{status === 'EM_ANALISE' ? 'Disputas em aberto' : 'Trocas'}</h1>
      <p className="mb-6 text-sm text-slate-600">
        {status === 'EM_ANALISE' ? 'Negociações contestadas, aguardando decisão.' : 'Todas as negociações da plataforma.'}
      </p>

      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="mb-6 rounded border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Todos os status</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {NEGOTIATION_STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {items?.length === 0 && <p className="text-sm text-slate-500">Nenhuma negociação encontrada.</p>}

      <div className="flex flex-col gap-3">
        {items?.map((n) => (
          <Link
            key={n.id}
            href={`/admin/negotiations/${n.id}`}
            className="flex items-center justify-between rounded border border-slate-200 bg-white p-4 hover:shadow-sm"
          >
            <div>
              <p className="font-mono text-xs text-slate-400">TRC-{n.id.slice(0, 8).toUpperCase()}</p>
              <p className="font-medium">
                {n.product.title}
                {n.offeredProduct ? ` ⇄ ${n.offeredProduct.title}` : ''}
              </p>
              <p className="text-xs text-slate-500">{NEGOTIATION_STATUS_LABEL[n.status]}</p>
            </div>
            <span className="text-slate-400">›</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

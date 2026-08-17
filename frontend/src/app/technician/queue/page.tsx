'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { TechnicianNav } from '@/components/technician-nav';
import { QueueItem } from '@/lib/technician';

const STATUS_LABEL: Record<QueueItem['status'], string> = {
  EM_CUSTODIA_FISICA: 'Aguardando inspeção',
  EM_INSPECAO: 'Em inspeção',
};

export default function TechnicianQueuePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'TECHNICIAN')) {
      router.push('/login');
      return;
    }
    if (user?.role === 'TECHNICIAN') {
      apiFetch<QueueItem[]>('/technician/queue')
        .then(setQueue)
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar'));
    }
  }, [authLoading, user, router]);

  if (authLoading || !user || user.role !== 'TECHNICIAN') return null;

  return (
    <div className="min-h-screen bg-slate-900">
      <TechnicianNav />
      <main className="mx-auto max-w-4xl px-6 py-8 text-white">
        <h1 className="mb-1 text-2xl font-bold">Painel de inspeção</h1>
        <p className="mb-6 text-sm text-slate-400">Trocas aguardando inspeção: {queue?.length ?? 0}</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex flex-col gap-3">
          {queue?.map((item) => (
            <Link
              key={item.id}
              href={`/technician/negotiations/${item.id}`}
              className="flex items-center justify-between rounded border border-slate-700 bg-slate-800 p-4 hover:bg-slate-750"
            >
              <div>
                <p className="font-mono text-xs text-slate-400">TRC-{item.id.slice(0, 8).toUpperCase()}</p>
                <p className="font-medium">
                  {item.product.title}
                  {item.offeredProduct ? ` ⇄ ${item.offeredProduct.title}` : ''}
                </p>
                <p className="text-sm text-slate-400">
                  {item.buyer.name} / {item.seller.name}
                </p>
              </div>
              <span className="rounded bg-slate-700 px-2 py-1 text-xs">{STATUS_LABEL[item.status]}</span>
            </Link>
          ))}
          {queue?.length === 0 && <p className="text-sm text-slate-400">Fila vazia.</p>}
        </div>
      </main>
    </div>
  );
}

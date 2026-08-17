'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { NEGOTIATION_STATUS_LABEL, Negotiation } from '@/lib/negotiations';

export default function NegotiationsListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [negotiations, setNegotiations] = useState<Negotiation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      apiFetch<Negotiation[]>('/negotiations/mine')
        .then(setNegotiations)
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar'));
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">Minhas negociações</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {negotiations && negotiations.length === 0 && (
        <p className="text-sm text-slate-500">Você ainda não tem nenhuma troca em andamento.</p>
      )}
      <div className="flex flex-col gap-3">
        {negotiations?.map((n) => {
          const isBuyer = n.buyerId === user.id;
          return (
            <Link
              key={n.id}
              href={`/negotiations/${n.id}`}
              className="flex items-center justify-between rounded border border-slate-200 bg-white p-4 hover:shadow-sm"
            >
              <div>
                <p className="font-medium">
                  {isBuyer ? n.product.title : n.offeredProduct?.title ?? 'Dinheiro'}
                  {' ⇄ '}
                  {isBuyer ? n.offeredProduct?.title ?? 'Dinheiro' : n.product.title}
                </p>
                <p className="text-sm text-slate-500">{NEGOTIATION_STATUS_LABEL[n.status]}</p>
              </div>
              <span className="text-slate-400">›</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

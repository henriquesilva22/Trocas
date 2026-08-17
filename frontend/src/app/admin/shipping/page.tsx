'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { formatBRL } from '@/lib/catalog';

interface ShippingChargeRow {
  id: string;
  payerRole: 'BUYER' | 'SELLER';
  amount: string;
  trackingCode: string | null;
  receiptUrl: string | null;
  payer: { name: string; email: string };
}

interface ListResponse {
  items: ShippingChargeRow[];
  total: number;
}

export default function AdminShippingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ShippingChargeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<ListResponse>('/admin/shipping?status=COMPROVANTE_ENVIADO&page=1&pageSize=50');
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os fretes');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') load();
  }, [authLoading, user, router, load]);

  async function handleConfirm(chargeId: string) {
    setError(null);
    setConfirmingId(chargeId);
    try {
      await apiFetch(`/admin/shipping/${chargeId}/confirm`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível confirmar');
    } finally {
      setConfirmingId(null);
    }
  }

  if (authLoading || !user) return <main className="px-8 py-16">Carregando...</main>;
  if (user.role !== 'ADMIN') {
    return <main className="px-8 py-16">Acesso restrito a administradores.</main>;
  }

  return (
    <main className="px-8 py-10">
      <h1 className="mb-2 text-2xl font-bold">Fretes pendentes de confirmação</h1>
      <p className="mb-6 text-sm text-slate-600">
        Comprovantes de frete enviados, aguardando confirmação de que a empresa recebeu o PIX.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {items?.length === 0 && <p className="text-sm text-slate-500">Nada pendente no momento.</p>}

      <div className="flex flex-col gap-3">
        {items?.map((charge) => (
          <div key={charge.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{charge.payer.name}</span>
              <span className="text-sm">{formatBRL(charge.amount)}</span>
            </div>
            {charge.receiptUrl && (
              <a href={charge.receiptUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline">
                Ver comprovante
              </a>
            )}
            <button
              onClick={() => handleConfirm(charge.id)}
              disabled={confirmingId === charge.id}
              className="mt-3 block rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {confirmingId === charge.id ? 'Confirmando...' : 'Confirmar recebimento'}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

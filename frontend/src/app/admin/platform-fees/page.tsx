'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';

interface PlatformFeeChargeRow {
  id: string;
  negotiationId: string;
  payerRole: 'BUYER' | 'SELLER';
  amount: string;
  status: string;
  receiptUrl: string | null;
  payer: { name: string; email: string };
}

interface ListResponse {
  items: PlatformFeeChargeRow[];
  total: number;
}

const ROLE_LABEL: Record<PlatformFeeChargeRow['payerRole'], string> = {
  BUYER: 'Comprador',
  SELLER: 'Vendedor',
};

export default function AdminPlatformFeesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<PlatformFeeChargeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<ListResponse>(
        '/admin/platform-fees?status=COMPROVANTE_ENVIADO&page=1&pageSize=50',
      );
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as cobranças');
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
      await apiFetch(`/admin/platform-fees/${chargeId}/confirm`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível confirmar');
    } finally {
      setConfirmingId(null);
    }
  }

  if (authLoading || !user) {
    return <main className="px-8 py-16">Carregando...</main>;
  }

  if (user.role !== 'ADMIN') {
    return <main className="px-8 py-16">Acesso restrito a administradores.</main>;
  }

  return (
    <main className="px-8 py-10">
      <h1 className="mb-2 text-2xl font-bold">Taxas pendentes de confirmação</h1>
      <p className="mb-6 text-sm text-slate-600">
        Comprovantes enviados pelos usuários, aguardando confirmação de que a empresa recebeu o PIX.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {items?.length === 0 && <p className="text-sm text-slate-500">Nada pendente no momento.</p>}

      <div className="flex flex-col gap-3">
        {items?.map((charge) => (
          <div key={charge.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {ROLE_LABEL[charge.payerRole]} — {charge.payer.name}
              </span>
              <span className="text-sm">R$ {Number(charge.amount).toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-500">Negociação {charge.negotiationId}</p>
            {charge.receiptUrl && (
              <a
                href={charge.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-700 underline"
              >
                Ver comprovante
              </a>
            )}
            <button
              onClick={() => handleConfirm(charge.id)}
              disabled={confirmingId === charge.id}
              className="mt-3 rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {confirmingId === charge.id ? 'Confirmando...' : 'Confirmar recebimento'}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

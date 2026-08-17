'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { formatBRL } from '@/lib/catalog';

interface PaymentRow {
  id: string;
  amount: string;
  status: 'PENDENTE' | 'COMPROVANTE_ENVIADO' | 'CONFIRMADO' | 'CONTESTADO';
  negotiation: { id: string; buyer: { name: string }; seller: { name: string } };
}

interface ListResponse {
  items: PaymentRow[];
  total: number;
}

const STATUS_LABEL: Record<PaymentRow['status'], string> = {
  PENDENTE: 'Aguardando pagamento',
  COMPROVANTE_ENVIADO: 'Comprovante enviado',
  CONFIRMADO: 'Confirmado',
  CONTESTADO: 'Contestado',
};

export default function AdminPaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<PaymentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<ListResponse>('/admin/payments?page=1&pageSize=50');
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os pagamentos');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') load();
  }, [authLoading, user, router, load]);

  if (authLoading || !user) return <main className="px-8 py-16">Carregando...</main>;
  if (user.role !== 'ADMIN') return <main className="px-8 py-16">Acesso restrito a administradores.</main>;

  return (
    <main className="px-8 py-10">
      <h1 className="mb-2 text-2xl font-bold">Pagamentos</h1>
      <p className="mb-6 text-sm text-slate-500">
        PIX direto comprador → vendedor pelo valor do produto (sem gateway) — confirmação é entre as
        partes, aqui é só acompanhamento.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {items?.length === 0 && <p className="text-sm text-slate-500">Nenhum pagamento registrado ainda.</p>}

      <div className="flex flex-col gap-2">
        {items?.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 text-sm">
            <div>
              <p className="font-medium">
                {p.negotiation.buyer.name} → {p.negotiation.seller.name}
              </p>
              <p className="text-slate-500">Negociação {p.negotiation.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatBRL(p.amount)}</p>
              <p className="text-slate-500">{STATUS_LABEL[p.status]}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

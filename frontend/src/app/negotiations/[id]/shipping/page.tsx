'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { formatBRL } from '@/lib/catalog';

interface ShippingCharge {
  id: string;
  amount: string;
  trackingCode: string | null;
  status: 'PENDENTE' | 'COMPROVANTE_ENVIADO' | 'CONFIRMADO';
  receiptUrl: string | null;
}

interface ShippingView {
  companyPixKey: string;
  companyReceiverName: string;
  charge: ShippingCharge;
}

const STATUS_LABEL: Record<ShippingCharge['status'], string> = {
  PENDENTE: 'Aguardando pagamento do frete',
  COMPROVANTE_ENVIADO: 'Comprovante enviado — aguardando confirmação',
  CONFIRMADO: 'Frete confirmado',
};

export default function ShippingPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState<ShippingView | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<ShippingView>(`/negotiations/${params.id}/shipping`);
      setInfo(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o frete');
    }
  }, [params.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) load();
  }, [authLoading, user, router, load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/negotiations/${params.id}/shipping/receipt`, {
        method: 'POST',
        body: JSON.stringify({ receiptUrl }),
      });
      setReceiptUrl('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar o comprovante');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user || !info) {
    return <main className="mx-auto max-w-lg px-6 py-16">{error ?? 'Carregando...'}</main>;
  }

  const { charge } = info;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold">Frete</h1>
      <p className="mb-6 text-sm text-slate-600">{STATUS_LABEL[charge.status]}</p>

      <div className="mb-6 rounded border border-slate-300 bg-white p-4">
        <p className="text-sm text-slate-500">Valor do frete</p>
        <p className="text-lg font-semibold">{formatBRL(charge.amount)}</p>
        <p className="mt-3 text-sm text-slate-500">Chave PIX da empresa</p>
        <p className="font-mono text-lg">{info.companyPixKey}</p>
        <p className="text-sm text-slate-500">Recebedor: {info.companyReceiverName}</p>
      </div>

      {charge.status === 'PENDENTE' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm font-medium">
            URL do comprovante
            <input
              type="url"
              required
              placeholder="https://..."
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Paguei o frete — anexar comprovante'}
          </button>
        </form>
      )}

      {charge.trackingCode && (
        <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4">
          <p className="font-medium">📦 Enviado</p>
          <p className="text-sm text-slate-500">Código de rastreamento</p>
          <p className="font-mono text-lg">{charge.trackingCode}</p>
        </div>
      )}
    </main>
  );
}

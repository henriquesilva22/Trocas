'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';

interface PaymentView {
  amount: number;
  sellerPixKey: string;
  sellerName: string;
  status: 'PENDENTE' | 'COMPROVANTE_ENVIADO' | 'CONFIRMADO' | 'CONTESTADO';
  receiptUrl: string | null;
  buyerId: string;
  sellerId: string;
}

const STATUS_LABEL: Record<PaymentView['status'], string> = {
  PENDENTE: 'Aguardando pagamento',
  COMPROVANTE_ENVIADO: 'Comprovante enviado — aguardando confirmação do vendedor',
  CONFIRMADO: 'Pagamento confirmado',
  CONTESTADO: 'Vendedor não confirmou o recebimento — em análise',
};

export default function PaymentPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<PaymentView>(`/negotiations/${params.id}/payments`);
      setPayment(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o pagamento');
    }
  }, [params.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) load();
  }, [authLoading, user, router, load]);

  async function handleSubmitReceipt(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/negotiations/${params.id}/payments/receipt`, {
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

  async function handleConfirm(received: boolean) {
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/negotiations/${params.id}/payments/confirm`, {
        method: 'POST',
        body: JSON.stringify({ received }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível confirmar');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user || !payment) {
    return <main className="mx-auto max-w-lg px-6 py-16">Carregando...</main>;
  }

  const isBuyer = payment.buyerId === user.id;
  const isSeller = payment.sellerId === user.id;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold">Pagamento do produto</h1>
      <p className="mb-6 text-sm text-slate-600">{STATUS_LABEL[payment.status]}</p>

      <div className="mb-6 rounded border border-slate-300 bg-white p-4">
        <p className="text-sm text-slate-500">Valor a pagar</p>
        <p className="text-lg font-semibold">R$ {payment.amount.toFixed(2)}</p>
        <p className="mt-3 text-sm text-slate-500">Chave PIX do vendedor</p>
        <p className="font-mono text-lg">{payment.sellerPixKey}</p>
        <p className="text-sm text-slate-500">Recebedor: {payment.sellerName}</p>
      </div>

      {isBuyer && payment.status === 'PENDENTE' && (
        <form onSubmit={handleSubmitReceipt} className="flex flex-col gap-4">
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
            {submitting ? 'Enviando...' : 'Paguei — anexar comprovante'}
          </button>
        </form>
      )}

      {isSeller && payment.status === 'COMPROVANTE_ENVIADO' && (
        <div className="flex flex-col gap-4">
          {payment.receiptUrl && (
            <a
              href={payment.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-700 underline"
            >
              Ver comprovante enviado
            </a>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => handleConfirm(true)}
              disabled={submitting}
              className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
            >
              Recebi
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={submitting}
              className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50"
            >
              Não recebi
            </button>
          </div>
        </div>
      )}

      {!isBuyer && !isSeller && (
        <p className="text-sm text-slate-500">Você não é parte desta negociação.</p>
      )}
    </main>
  );
}

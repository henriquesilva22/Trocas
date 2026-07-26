'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';

interface PlatformFeeCharge {
  id: string;
  payerRole: 'BUYER' | 'SELLER';
  payerId: string;
  amount: string;
  status: 'PENDENTE' | 'COMPROVANTE_ENVIADO' | 'CONFIRMADO';
  receiptUrl: string | null;
}

interface PlatformFeeInfo {
  companyPixKey: string;
  companyReceiverName: string;
  charges: PlatformFeeCharge[];
}

const STATUS_LABEL: Record<PlatformFeeCharge['status'], string> = {
  PENDENTE: 'Aguardando pagamento',
  COMPROVANTE_ENVIADO: 'Comprovante enviado — aguardando confirmação',
  CONFIRMADO: 'Confirmado',
};

const ROLE_LABEL: Record<PlatformFeeCharge['payerRole'], string> = {
  BUYER: 'Comprador',
  SELLER: 'Vendedor',
};

export default function PlatformFeePage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState<PlatformFeeInfo | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<PlatformFeeInfo>(`/negotiations/${params.id}/platform-fee`);
      setInfo(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a cobrança');
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
      await apiFetch(`/negotiations/${params.id}/platform-fee/receipt`, {
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
    return <main className="mx-auto max-w-lg px-6 py-16">Carregando...</main>;
  }

  const myCharge = info.charges.find((c) => c.payerId === user.id);

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold">Taxa da plataforma</h1>
      <p className="mb-6 text-sm text-slate-600">
        Comprador e vendedor pagam a taxa separadamente, direto pra chave PIX da empresa.
      </p>

      <div className="mb-6 rounded border border-slate-300 bg-white p-4">
        <p className="text-sm text-slate-500">Chave PIX da empresa</p>
        <p className="font-mono text-lg">{info.companyPixKey}</p>
        <p className="text-sm text-slate-500">Recebedor: {info.companyReceiverName}</p>
      </div>

      <div className="mb-6 flex flex-col gap-3">
        {info.charges.map((charge) => (
          <div key={charge.id} className="rounded border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{ROLE_LABEL[charge.payerRole]}</span>
              <span className="text-sm">{STATUS_LABEL[charge.status]}</span>
            </div>
            <p className="text-sm text-slate-600">Valor: R$ {Number(charge.amount).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {myCharge?.status === 'PENDENTE' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm font-medium">
            URL do comprovante (foto/print já enviado pro Storage)
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
            {submitting ? 'Enviando...' : 'Enviei o PIX — anexar comprovante'}
          </button>
        </form>
      )}

      {!myCharge && <p className="text-sm text-slate-500">Você não é parte desta negociação.</p>}
    </main>
  );
}

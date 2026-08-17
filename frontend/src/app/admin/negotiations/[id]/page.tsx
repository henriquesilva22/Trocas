'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';

interface AdminNegotiationDetail {
  id: string;
  status: string;
  amount: string;
  product: { title: string; description: string };
  offeredProduct: { title: string; description: string } | null;
  buyer: { name: string };
  seller: { name: string };
  inspection: { approved: boolean | null; checklist: unknown } | null;
}

export default function AdminNegotiationDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [negotiation, setNegotiation] = useState<AdminNegotiationDetail | null>(null);
  const [resolution, setResolution] = useState<'APROVAR' | 'CANCELAR'>('APROVAR');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<AdminNegotiationDetail>(`/admin/negotiations/${params.id}`);
      setNegotiation(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar');
    }
  }, [params.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') load();
  }, [authLoading, user, router, load]);

  async function handleResolve(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/admin/negotiations/${params.id}/resolve-dispute`, {
        method: 'POST',
        body: JSON.stringify({ resolution, reason }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível resolver');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) return <main className="mx-auto max-w-lg px-6 py-16">Carregando...</main>;
  if (user.role !== 'ADMIN') {
    return <main className="mx-auto max-w-lg px-6 py-16">Acesso restrito a administradores.</main>;
  }
  if (!negotiation) return <main className="mx-auto max-w-lg px-6 py-16">{error ?? 'Carregando...'}</main>;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold">Disputa — TRC-{negotiation.id.slice(0, 8).toUpperCase()}</h1>
      <p className="mb-6 text-sm text-slate-600">Status atual: {negotiation.status}</p>

      <div className="mb-6 rounded border border-slate-200 bg-white p-4 text-sm">
        <p>
          <span className="text-slate-500">Comprador:</span> {negotiation.buyer.name}
        </p>
        <p>
          <span className="text-slate-500">Vendedor:</span> {negotiation.seller.name}
        </p>
        <p className="mt-2">
          <span className="text-slate-500">Produto:</span> {negotiation.product.title}
        </p>
        {negotiation.offeredProduct && (
          <p>
            <span className="text-slate-500">Ofertado:</span> {negotiation.offeredProduct.title}
          </p>
        )}
        {negotiation.inspection && (
          <p className="mt-2">
            <span className="text-slate-500">Resultado da inspeção:</span>{' '}
            {negotiation.inspection.approved ? 'Aprovado' : 'Reprovado'}
          </p>
        )}
      </div>

      {negotiation.status !== 'EM_ANALISE' ? (
        <p className="text-sm text-slate-500">Esta disputa já foi resolvida.</p>
      ) : (
        <form onSubmit={handleResolve} className="flex flex-col gap-4">
          <p className="text-sm font-medium">Resultado da análise</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={resolution === 'APROVAR'}
              onChange={() => setResolution('APROVAR')}
            />
            Aceitar condição — retoma o fluxo normal (segue pro pagamento)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={resolution === 'CANCELAR'}
              onChange={() => setResolution('CANCELAR')}
            />
            Troca cancelada
          </label>
          <label className="text-sm font-medium">
            Motivo
            <textarea
              required
              minLength={10}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Resolver disputa'}
          </button>
        </form>
      )}
    </main>
  );
}

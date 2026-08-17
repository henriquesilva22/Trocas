'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { CATEGORY_LABEL, CONDITION_LABEL, formatBRL, Product, Proposal } from '@/lib/catalog';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [receivedProposals, setReceivedProposals] = useState<Proposal[] | null>(null);
  const [myProposals, setMyProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCounterId, setActiveCounterId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Product>(`/products/${params.id}`);
      setProduct(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Produto não encontrado');
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = !!user && !!product && product.sellerId === user.id;

  useEffect(() => {
    if (!user || !product) return;
    if (isOwner) {
      apiFetch<Proposal[]>(`/products/${product.id}/proposals`).then(setReceivedProposals).catch(() => {});
    } else {
      apiFetch<Proposal[]>(`/products/${product.id}/proposals/mine`).then(setMyProposals).catch(() => {});
    }
  }, [user, product, isOwner]);

  async function handleDecision(proposalId: string, action: 'accept' | 'reject' | 'cancel') {
    setError(null);
    try {
      await apiFetch(`/proposals/${proposalId}/${action}`, { method: 'POST' });
      await load();
      if (isOwner) {
        setReceivedProposals(await apiFetch<Proposal[]>(`/products/${params.id}/proposals`));
      } else {
        setMyProposals(await apiFetch<Proposal[]>(`/products/${params.id}/proposals/mine`));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir a ação');
    }
  }

  async function handleCounter(e: FormEvent, proposalId: string) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/proposals/${proposalId}/counter`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(counterAmount) }),
      });
      setActiveCounterId(null);
      setCounterAmount('');
      setReceivedProposals(await apiFetch<Proposal[]>(`/products/${params.id}/proposals`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar a contraproposta');
    }
  }

  if (!product) {
    return <main className="mx-auto max-w-3xl px-6 py-16">{error ?? 'Carregando...'}</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square w-full overflow-hidden rounded bg-slate-100">
            {product.photoUrls[0] ? (
              <img src={product.photoUrls[0]} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">Sem foto</div>
            )}
          </div>
          {product.photoUrls.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {product.photoUrls.slice(1).map((url) => (
                <img key={url} src={url} alt="" className="h-16 w-16 rounded object-cover" />
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <p className="mt-1 text-2xl font-bold">{formatBRL(product.priceAsking)}</p>
          <p className="mt-1 text-sm text-slate-500">📍 {product.city}</p>
          <p className="mt-1 text-sm text-slate-500">
            Estado: {CONDITION_LABEL[product.condition]} — {CATEGORY_LABEL[product.category]}
          </p>

          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{product.description}</p>

          <div className="mt-4">
            <p className="text-sm font-medium">Aceita:</p>
            <p className="text-sm text-slate-600">
              {product.acceptedCategories.length === 0
                ? 'Qualquer categoria'
                : product.acceptedCategories.map((c) => CATEGORY_LABEL[c]).join(', ')}{' '}
              💰 Diferença em dinheiro
            </p>
          </div>

          {product.seller && (
            <div className="mt-4 rounded border border-slate-200 p-3">
              <p className="font-medium">{product.seller.name}</p>
              <p className="text-sm text-slate-600">★ {(product.seller.trustScore / 20).toFixed(1)} de reputação</p>
            </div>
          )}

          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium">🛡️ Troca protegida pelo Trocas</p>
            <p className="mt-1 text-slate-600">
              O produto será enviado ou entregue em um Hub de Inspeção. Nossa equipe verifica o produto
              antes da conclusão da troca. Taxa de intermediação: R$ 15 por usuário.
            </p>
          </div>

          {!isOwner && product.status === 'DISPONIVEL' && user && (
            <Link
              href={`/products/${product.id}/propose`}
              className="mt-6 inline-block rounded bg-slate-900 px-5 py-2 font-medium text-white"
            >
              Propor troca
            </Link>
          )}
          {!user && !authLoading && (
            <Link href="/login" className="mt-6 inline-block rounded bg-slate-900 px-5 py-2 font-medium text-white">
              Entre para propor troca
            </Link>
          )}
        </div>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {isOwner && receivedProposals && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">Propostas recebidas</h2>
          {receivedProposals.length === 0 && <p className="text-sm text-slate-500">Nenhuma proposta ainda.</p>}
          <div className="flex flex-col gap-3">
            {receivedProposals.map((p) => (
              <div key={p.id} className="rounded border border-slate-200 p-3">
                <p className="text-sm">
                  <span className="font-medium">{p.buyer.name}</span> oferece{' '}
                  {p.offeredProduct ? <span className="font-medium">{p.offeredProduct.title}</span> : 'dinheiro'}
                  {Number(p.amount) > 0 && <> + {formatBRL(p.amount)}</>}
                </p>
                {p.message && <p className="text-sm text-slate-600">&ldquo;{p.message}&rdquo;</p>}
                <p className="text-xs text-slate-500">Status: {p.status}</p>

                {p.status === 'PENDENTE' && p.proposedBy === 'BUYER' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleDecision(p.id, 'accept')}
                      className="rounded bg-green-700 px-3 py-1 text-sm text-white"
                    >
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleDecision(p.id, 'reject')}
                      className="rounded bg-red-700 px-3 py-1 text-sm text-white"
                    >
                      Recusar
                    </button>
                    <button
                      onClick={() => setActiveCounterId(activeCounterId === p.id ? null : p.id)}
                      className="rounded border border-slate-300 px-3 py-1 text-sm"
                    >
                      Contraproposta
                    </button>
                  </div>
                )}
                {p.status === 'PENDENTE' && p.proposedBy === 'SELLER' && (
                  <p className="mt-2 text-xs text-slate-500">Aguardando resposta do comprador</p>
                )}

                {activeCounterId === p.id && (
                  <form onSubmit={(e) => handleCounter(e, p.id)} className="mt-2 flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="Nova diferença em R$"
                      value={counterAmount}
                      onChange={(e) => setCounterAmount(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-sm text-white">
                      Enviar
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!isOwner && myProposals && myProposals.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">Suas propostas neste produto</h2>
          <div className="flex flex-col gap-3">
            {myProposals.map((p) => (
              <div key={p.id} className="rounded border border-slate-200 p-3">
                <p className="text-sm">
                  Você oferece {p.offeredProduct ? p.offeredProduct.title : 'dinheiro'}
                  {Number(p.amount) > 0 && <> + {formatBRL(p.amount)}</>}
                </p>
                <p className="text-xs text-slate-500">Status: {p.status}</p>

                {p.status === 'PENDENTE' && p.proposedBy === 'BUYER' && (
                  <button
                    onClick={() => handleDecision(p.id, 'cancel')}
                    className="mt-2 rounded border border-slate-300 px-3 py-1 text-sm"
                  >
                    Cancelar proposta
                  </button>
                )}
                {p.status === 'PENDENTE' && p.proposedBy === 'SELLER' && (
                  <div className="mt-2 flex gap-2">
                    <p className="text-sm text-slate-700">O vendedor fez uma contraproposta.</p>
                    <button
                      onClick={() => handleDecision(p.id, 'accept')}
                      className="rounded bg-green-700 px-3 py-1 text-sm text-white"
                    >
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleDecision(p.id, 'reject')}
                      className="rounded bg-red-700 px-3 py-1 text-sm text-white"
                    >
                      Recusar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

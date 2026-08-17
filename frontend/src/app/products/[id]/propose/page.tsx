'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { formatBRL, Product, Proposal } from '@/lib/catalog';

export default function ProposeTradePage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [offeredProductId, setOfferedProductId] = useState('');
  const [amount, setAmount] = useState('0');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const target = await apiFetch<Product>(`/products/${params.id}`);
    setProduct(target);
    const mine = await apiFetch<Product[]>('/products/mine');
    setMyProducts(mine.filter((p) => p.status === 'DISPONIVEL'));
  }, [params.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) load().catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar'));
  }, [authLoading, user, router, load]);

  const offeredProduct = myProducts.find((p) => p.id === offeredProductId) ?? null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const proposal = await apiFetch<Proposal>(`/products/${params.id}/proposals`, {
        method: 'POST',
        body: JSON.stringify({
          offeredProductId: offeredProductId || undefined,
          amount: Number(amount || 0),
          message: message || undefined,
        }),
      });
      router.push(`/products/${proposal.productId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar a proposta');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user || !product) {
    return <main className="mx-auto max-w-lg px-6 py-16">{error ?? 'Carregando...'}</main>;
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">Propor troca</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm font-medium">Você está oferecendo</p>
          {myProducts.length === 0 ? (
            <p className="text-sm text-slate-500">
              Você ainda não tem produtos disponíveis para oferecer — pode propor só em dinheiro.
            </p>
          ) : (
            <select
              value={offeredProductId}
              onChange={(e) => setOfferedProductId(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Só dinheiro (sem produto)</option>
              {myProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {formatBRL(p.priceAsking)}
                </option>
              ))}
            </select>
          )}
          {offeredProduct && (
            <div className="mt-2 flex items-center gap-3 rounded border border-slate-200 p-2">
              {offeredProduct.photoUrls[0] && (
                <img src={offeredProduct.photoUrls[0]} alt="" className="h-12 w-12 rounded object-cover" />
              )}
              <div className="text-sm">
                <p className="font-medium">{offeredProduct.title}</p>
                <p className="text-slate-500">{formatBRL(offeredProduct.priceAsking)}</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Pelo produto</p>
          <div className="flex items-center gap-3 rounded border border-slate-200 p-2">
            {product.photoUrls[0] && (
              <img src={product.photoUrls[0]} alt="" className="h-12 w-12 rounded object-cover" />
            )}
            <div className="text-sm">
              <p className="font-medium">{product.title}</p>
              <p className="text-slate-500">{formatBRL(product.priceAsking)}</p>
            </div>
          </div>
        </div>

        <label className="text-sm font-medium">
          Diferença em dinheiro (R$, pode ser 0)
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="text-sm font-medium">
          Mensagem (opcional)
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>

        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <p>Taxa de intermediação: R$ 15 (paga por você e pelo outro usuário, cada um a sua parte)</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Enviando...' : 'Enviar proposta'}
        </button>
      </form>
    </main>
  );
}

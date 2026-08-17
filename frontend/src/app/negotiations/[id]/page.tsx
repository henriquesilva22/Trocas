'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { formatBRL } from '@/lib/catalog';
import {
  DeliveryMethod,
  Hub,
  NEGOTIATION_STATUS_LABEL,
  NegotiationDetail,
  ReceiveMethod,
  STATUS_ORDER,
} from '@/lib/negotiations';
import { HubCard } from '@/components/hub-card';
import { QrCode } from '@/components/qr-code';

export default function NegotiationDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [negotiation, setNegotiation] = useState<NegotiationDetail | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [method, setMethod] = useState<DeliveryMethod>('ENVIO');
  const [scheduledAt, setScheduledAt] = useState('');
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>('RETIRADA_HUB');
  const [showQr, setShowQr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch<NegotiationDetail>(`/negotiations/${params.id}`);
    setNegotiation(data);
  }, [params.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) load().catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar'));
  }, [authLoading, user, router, load]);

  useEffect(() => {
    if (negotiation?.status === 'AGUARDANDO_DROPOFF' && hubs.length === 0) {
      apiFetch<Hub[]>('/hubs').then(setHubs).catch(() => {});
    }
  }, [negotiation?.status, hubs.length]);

  if (authLoading || !user || !negotiation) {
    return <main className="mx-auto max-w-2xl px-6 py-16">{error ?? 'Carregando...'}</main>;
  }

  const isBuyer = negotiation.buyerId === user.id;
  const myMethod = isBuyer ? negotiation.buyerDeliveryMethod : negotiation.sellerDeliveryMethod;
  const otherName = isBuyer ? negotiation.seller.name : negotiation.buyer.name;
  const currentIndex = STATUS_ORDER.indexOf(negotiation.status);

  // Vendedor só tem o que "receber de volta" se a troca foi por produto
  // (offeredProductId) — venda 100% em dinheiro não tem lado do vendedor aqui.
  const needsReceiveChoice = isBuyer || negotiation.offeredProductId !== null;
  const myReceiveMethod = isBuyer ? negotiation.buyerReceiveMethod : negotiation.sellerReceiveMethod;
  const myReceivedAt = isBuyer ? negotiation.buyerReceivedAt : negotiation.sellerReceivedAt;

  async function handleChooseDelivery(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/negotiations/${params.id}/delivery`, {
        method: 'POST',
        body: JSON.stringify({
          method,
          scheduledAt: method === 'PRESENCIAL' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChooseReceiveMethod(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/negotiations/${params.id}/receive-method`, {
        method: 'POST',
        body: JSON.stringify({ method: receiveMethod }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmReceived() {
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/negotiations/${params.id}/receive-confirm`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível confirmar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-1 text-2xl font-bold">Troca #{negotiation.id.slice(0, 8).toUpperCase()}</h1>
      <p className="mb-6 text-sm text-slate-500">Com {otherName}</p>

      <div className="mb-6 flex items-center justify-between rounded border border-slate-200 bg-white p-4">
        <div>
          <p className="text-xs text-slate-500">Você</p>
          <p className="font-medium">{isBuyer ? negotiation.offeredProduct?.title ?? 'Dinheiro' : negotiation.product.title}</p>
        </div>
        <span className="text-xl">⇄</span>
        <div className="text-right">
          <p className="text-xs text-slate-500">{otherName}</p>
          <p className="font-medium">{isBuyer ? negotiation.product.title : negotiation.offeredProduct?.title ?? 'Dinheiro'}</p>
        </div>
      </div>

      {Number(negotiation.amount) > 0 && (
        <p className="mb-6 text-sm text-slate-600">Diferença em dinheiro: {formatBRL(negotiation.amount)}</p>
      )}

      <div className="mb-8">
        <p className="mb-2 text-sm font-medium">STATUS</p>
        <div className="flex flex-col gap-1 text-sm">
          {STATUS_ORDER.map((status, i) => (
            <p key={status} className={i <= currentIndex ? 'font-medium text-slate-900' : 'text-slate-400'}>
              {i <= currentIndex ? '✅' : '⏳'} {NEGOTIATION_STATUS_LABEL[status]}
            </p>
          ))}
          {negotiation.status === 'CANCELADO' && <p className="font-medium text-red-700">❌ Cancelada</p>}
          {negotiation.status === 'EM_ANALISE' && (
            <p className="font-medium text-amber-700">⚠️ Em análise (disputa aberta)</p>
          )}
          {negotiation.status === 'INSPECIONADO_REPROVADO' && (
            <p className="font-medium text-red-700">❌ Reprovado na inspeção</p>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {negotiation.status === 'AGUARDANDO_PAGAMENTO_TAXA' && (
        <Link
          href={`/negotiations/${negotiation.id}/platform-fee`}
          className="inline-block rounded bg-slate-900 px-4 py-2 text-white"
        >
          Pagar taxa de intermediação (R$ 15)
        </Link>
      )}

      {(negotiation.status === 'PAGAMENTO_PENDENTE' || negotiation.status === 'COMPROVANTE_ENVIADO') &&
        Number(negotiation.amount) > 0 && (
          <Link
            href={`/negotiations/${negotiation.id}/payment`}
            className="inline-block rounded bg-slate-900 px-4 py-2 text-white"
          >
            Ir para pagamento da diferença
          </Link>
        )}

      {negotiation.status === 'PIN_GERADO' && (
        <div className="flex flex-col gap-6">
          <div className="rounded border border-green-200 bg-green-50 p-4">
            <p className="font-medium text-green-800">🎉 Troca aprovada na inspeção!</p>
            <p className="mt-1 text-sm text-green-700">Os dois produtos passaram pela inspeção.</p>
          </div>

          {!needsReceiveChoice ? (
            <p className="text-sm text-slate-500">
              Você já recebeu o pagamento — não há produto físico pra você receber nesta troca.
            </p>
          ) : myReceivedAt ? (
            <p className="rounded border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
              ✅ Você já recebeu seu produto.
            </p>
          ) : !myReceiveMethod ? (
            <section>
              <h2 className="mb-2 text-lg font-bold">Como deseja receber?</h2>
              <form onSubmit={handleChooseReceiveMethod} className="flex flex-col gap-3">
                <label className="flex items-center gap-2 rounded border border-slate-200 p-3 text-sm">
                  <input
                    type="radio"
                    checked={receiveMethod === 'RETIRADA_HUB'}
                    onChange={() => setReceiveMethod('RETIRADA_HUB')}
                  />
                  🏢 Retirar no Hub — Grátis
                </label>
                <label className="flex items-center gap-2 rounded border border-slate-200 p-3 text-sm">
                  <input
                    type="radio"
                    checked={receiveMethod === 'ENVIO'}
                    onChange={() => setReceiveMethod('ENVIO')}
                  />
                  🚚 Receber em casa — Frete: R$ 24,90
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-fit rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Escolher
                </button>
              </form>
            </section>
          ) : myReceiveMethod === 'RETIRADA_HUB' ? (
            <section className="rounded border border-slate-200 p-4">
              <p className="font-medium">Seu produto está disponível</p>
              {negotiation.hub && <p className="text-sm text-slate-600">Hub: {negotiation.hub.name}</p>}
              <p className="mt-2 text-sm text-slate-500">Código de retirada</p>
              {negotiation.pickupPin && (
                <p className="font-mono text-2xl tracking-widest">{negotiation.pickupPin}</p>
              )}
              <p className="mt-1 text-sm text-slate-500">Apresente este código ao responsável pelo Hub.</p>
              <button
                onClick={() => setShowQr((v) => !v)}
                className="mt-3 rounded border border-slate-300 px-4 py-2 text-sm"
              >
                {showQr ? 'Esconder QR Code' : 'Gerar QR Code'}
              </button>
              {showQr && negotiation.pickupPin && (
                <div className="mt-3">
                  <QrCode value={negotiation.pickupPin} size={180} />
                </div>
              )}
            </section>
          ) : (
            <section className="rounded border border-slate-200 p-4">
              <p className="font-medium">Seu produto está pronto para envio</p>
              <Link
                href={`/negotiations/${negotiation.id}/shipping`}
                className="mt-2 inline-block rounded bg-slate-900 px-4 py-2 text-sm text-white"
              >
                Pagar frete / ver rastreio
              </Link>
              <button
                onClick={handleConfirmReceived}
                disabled={submitting}
                className="mt-3 block rounded border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
              >
                Recebi meu produto
              </button>
            </section>
          )}
        </div>
      )}

      {negotiation.status === 'FINALIZADO' && (
        <div className="rounded border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-800">🎉 Troca concluída!</p>
          <p className="mt-1 text-sm text-green-700">Intermediação concluída.</p>
          <Link
            href={`/negotiations/${negotiation.id}/review`}
            className="mt-3 inline-block rounded bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Avaliar usuário
          </Link>
        </div>
      )}

      {negotiation.status === 'AGUARDANDO_DROPOFF' && (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-2 text-lg font-bold">Como entregar seu produto?</h2>
            {myMethod ? (
              <p className="text-sm text-slate-600">
                Você escolheu: {myMethod === 'ENVIO' ? 'Envio para o Hub' : 'Entrega presencial'}
                {negotiation[isBuyer ? 'buyerScheduledAt' : 'sellerScheduledAt'] &&
                  ` — agendado para ${new Date(negotiation[isBuyer ? 'buyerScheduledAt' : 'sellerScheduledAt']!).toLocaleString('pt-BR')}`}
              </p>
            ) : (
              <form onSubmit={handleChooseDelivery} className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={method === 'ENVIO'}
                    onChange={() => setMethod('ENVIO')}
                  />
                  🚚 Enviar para um Hub
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={method === 'PRESENCIAL'}
                    onChange={() => setMethod('PRESENCIAL')}
                  />
                  🤝 Entrega presencial
                </label>
                {method === 'PRESENCIAL' && (
                  <label className="text-sm">
                    Data e horário
                    <input
                      type="datetime-local"
                      required
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    />
                  </label>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-fit rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : method === 'ENVIO' ? 'Ver instruções' : 'Agendar'}
                </button>
              </form>
            )}

            {myMethod === 'ENVIO' && (
              <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium">Envie seu produto para:</p>
                <p>Hub Trocas</p>
                <p>Código: TRC-{negotiation.id.slice(0, 8).toUpperCase()}</p>
              </div>
            )}
          </section>

          {hubs.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-bold">Hubs próximos</h2>
              <div className="flex flex-col gap-2">
                {hubs.map((hub) => (
                  <HubCard key={hub.id} hub={hub} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

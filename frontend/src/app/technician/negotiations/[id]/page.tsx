'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, apiUpload, ApiError } from '@/lib/api';
import { TechnicianNav } from '@/components/technician-nav';
import { CHECKLIST_ITEMS, Checklist, ChecklistItemKey, QueueItem } from '@/lib/technician';

function initialAnswers(): Checklist {
  return CHECKLIST_ITEMS.reduce((acc, item) => {
    acc[item.key] = { passed: true };
    return acc;
  }, {} as Checklist);
}

export default function TechnicianInspectionPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<QueueItem | null>(null);
  const [answers, setAnswers] = useState<Checklist>(initialAnswers());
  const [photos, setPhotos] = useState<File[]>([]);
  const [reportUrl, setReportUrl] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');
  const [sealCode, setSealCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch<QueueItem>(`/technician/negotiations/${params.id}`);
    setItem(data);
  }, [params.id]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'TECHNICIAN')) {
      router.push('/login');
      return;
    }
    if (user?.role === 'TECHNICIAN') {
      load().catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar'));
    }
  }, [authLoading, user, router, load]);

  function toggleAnswer(key: ChecklistItemKey, passed: boolean) {
    setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], passed } }));
  }

  function setNote(key: ChecklistItemKey, note: string) {
    setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], note } }));
  }

  function handlePhotos(e: ChangeEvent<HTMLInputElement>) {
    setPhotos(Array.from(e.target.files ?? []).slice(0, 8));
  }

  async function handleStart() {
    if (!item) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/negotiations/${params.id}/inspection/start`, {
        method: 'POST',
        body: JSON.stringify({ hubId: item.hub?.id }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível iniciar');
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadPhotos(): Promise<string[]> {
    if (photos.length === 0) return [];
    const formData = new FormData();
    photos.forEach((file) => formData.append('photos', file));
    const result = await apiUpload<{ photoUrls: string[] }>(
      `/negotiations/${params.id}/inspection/photos`,
      formData,
    );
    return result.photoUrls;
  }

  async function handleApprove(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const photoUrls = await uploadPhotos();
      await apiFetch(`/negotiations/${params.id}/inspection/approve`, {
        method: 'POST',
        body: JSON.stringify({ checklist: answers, photoUrls, reportUrl, shelfLocation, sealCode }),
      });
      router.push('/technician/queue');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível aprovar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setError(null);
    setSubmitting(true);
    try {
      const photoUrls = await uploadPhotos();
      await apiFetch(`/negotiations/${params.id}/inspection/reject`, {
        method: 'POST',
        body: JSON.stringify({ checklist: answers, photoUrls }),
      });
      router.push('/technician/queue');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível reprovar');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user || user.role !== 'TECHNICIAN' || !item) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <TechnicianNav />
        <main className="mx-auto max-w-2xl px-6 py-8">{error ?? 'Carregando...'}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <TechnicianNav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <p className="font-mono text-xs text-slate-400">TRC-{item.id.slice(0, 8).toUpperCase()}</p>
        <h1 className="mb-4 text-2xl font-bold">Inspeção</h1>

        <div className="mb-6 rounded border border-slate-700 bg-slate-800 p-4 text-sm">
          <p>
            Produto: <span className="font-medium">{item.product.title}</span>
          </p>
          {item.offeredProduct && (
            <p>
              Produto ofertado: <span className="font-medium">{item.offeredProduct.title}</span>
            </p>
          )}
          <p className="text-slate-400">
            {item.buyer.name} / {item.seller.name}
          </p>
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {item.status === 'EM_CUSTODIA_FISICA' && (
          <button
            onClick={handleStart}
            disabled={submitting}
            className="rounded bg-white px-4 py-2 font-medium text-slate-900 disabled:opacity-50"
          >
            Iniciar inspeção
          </button>
        )}

        {item.status === 'EM_INSPECAO' && (
          <form onSubmit={handleApprove} className="flex flex-col gap-5">
            {CHECKLIST_ITEMS.map(({ key, label }) => (
              <div key={key} className="rounded border border-slate-700 p-3">
                <p className="mb-2 text-sm font-medium">{label}</p>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={key}
                      checked={answers[key].passed}
                      onChange={() => toggleAnswer(key, true)}
                    />
                    Sim
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={key}
                      checked={!answers[key].passed}
                      onChange={() => toggleAnswer(key, false)}
                    />
                    Não
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Observação (opcional)"
                  value={answers[key].note ?? ''}
                  onChange={(e) => setNote(key, e.target.value)}
                  className="mt-2 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
                />
              </div>
            ))}

            <label className="text-sm font-medium">
              Fotos
              <input type="file" accept="image/*" multiple onChange={handlePhotos} className="mt-1 block w-full text-sm" />
            </label>

            <label className="text-sm font-medium">
              URL do laudo
              <input
                type="url"
                required
                value={reportUrl}
                onChange={(e) => setReportUrl(e.target.value)}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium">
              Localização na prateleira
              <input
                type="text"
                required
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium">
              Código do lacre
              <input
                type="text"
                required
                value={sealCode}
                onChange={(e) => setSealCode(e.target.value)}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              />
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-green-600 px-4 py-2 font-medium disabled:opacity-50"
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={submitting}
                className="rounded bg-red-600 px-4 py-2 font-medium disabled:opacity-50"
              >
                Reprovar
              </button>
            </div>
          </form>
        )}

        {item.status !== 'EM_CUSTODIA_FISICA' && item.status !== 'EM_INSPECAO' && (
          <p className="text-sm text-slate-400">Inspeção já concluída.</p>
        )}
      </main>
    </div>
  );
}

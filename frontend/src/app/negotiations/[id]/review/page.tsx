'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';

export default function ReviewPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!authLoading && !user) {
    router.push('/login');
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/negotiations/${params.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar a avaliação');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) return null;

  if (done) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 font-medium">Avaliação enviada — obrigado!</p>
        <button onClick={() => router.push(`/negotiations/${params.id}`)} className="mt-4 text-sm underline">
          Voltar pra troca
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-bold">⭐ Como foi sua troca?</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-1 text-3xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} estrelas`}
              className={n <= rating ? 'text-amber-500' : 'text-slate-300'}
            >
              ★
            </button>
          ))}
        </div>
        <label className="text-sm font-medium">
          Comentário (opcional)
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Enviando...' : 'Enviar avaliação'}
        </button>
      </form>
    </main>
  );
}

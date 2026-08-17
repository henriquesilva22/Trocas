'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { CATEGORY_ICON, CATEGORY_LABEL, ProductCategory } from '@/lib/catalog';
import { PublicProfile } from '@/lib/reputation';

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PublicProfile>(`/users/${params.id}/profile`)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o perfil'));
  }, [params.id]);

  if (error) return <main className="mx-auto max-w-lg px-6 py-16 text-sm text-red-600">{error}</main>;
  if (!profile) return <main className="mx-auto max-w-lg px-6 py-16">Carregando...</main>;

  const stars = profile.avgRating ? Math.round(profile.avgRating) : 0;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold">{profile.name}</h1>
      <p className="mt-1 text-lg">
        {'★'.repeat(stars)}
        {'☆'.repeat(5 - stars)}{' '}
        {profile.avgRating !== null ? profile.avgRating.toFixed(1) : '—'}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded border border-slate-200 p-3">
          <p className="text-xl font-bold">{profile.finalizedTrades}</p>
          <p className="text-slate-500">trocas concluídas</p>
        </div>
        <div className="rounded border border-slate-200 p-3">
          <p className="text-xl font-bold">{profile.reviewCount}</p>
          <p className="text-slate-500">avaliações</p>
        </div>
        <div className="rounded border border-slate-200 p-3">
          <p className="text-xl font-bold">{profile.inProgressTrades}</p>
          <p className="text-slate-500">em andamento</p>
        </div>
      </div>

      {Object.keys(profile.tradesByCategory).length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Trocas realizadas</p>
          <ul className="flex flex-col gap-1 text-sm text-slate-700">
            {Object.entries(profile.tradesByCategory).map(([category, count]) => (
              <li key={category}>
                {CATEGORY_ICON[category as ProductCategory]} {count} {CATEGORY_LABEL[category as ProductCategory]}
                {(count ?? 0) > 1 ? 's' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500">Taxa de conclusão</p>
          <p className="font-medium">
            {profile.completionRate !== null ? `${Math.round(profile.completionRate * 100)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Cancelamentos</p>
          <p className="font-medium">{profile.cancelledTrades}</p>
        </div>
        <div>
          <p className="text-slate-500">Disputas</p>
          <p className="font-medium">{profile.disputesCount}</p>
        </div>
        <div>
          <p className="text-slate-500">Trust score</p>
          <p className="font-medium">{profile.trustScore}/100</p>
        </div>
      </div>
    </main>
  );
}

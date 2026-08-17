'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';

interface Hub {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  openingHours: string | null;
  isActive: boolean;
}

export default function AdminHubsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [hubs, setHubs] = useState<Hub[] | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Hub[]>('/hubs');
      setHubs(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os hubs');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN') load();
  }, [authLoading, user, router, load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch('/hubs', {
        method: 'POST',
        body: JSON.stringify({
          name,
          address,
          city,
          latitude: Number(latitude),
          longitude: Number(longitude),
          openingHours: openingHours || undefined,
        }),
      });
      setName('');
      setAddress('');
      setCity('');
      setLatitude('');
      setLongitude('');
      setOpeningHours('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o hub');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    setError(null);
    setBusyId(id);
    try {
      await apiFetch(`/hubs/${id}/deactivate`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível desativar');
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || !user) return <main className="px-8 py-16">Carregando...</main>;
  if (user.role !== 'ADMIN') return <main className="px-8 py-16">Acesso restrito a administradores.</main>;

  return (
    <main className="px-8 py-10">
      <h1 className="mb-6 text-2xl font-bold">Hubs</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-8 flex flex-col gap-2">
        {hubs?.map((hub) => (
          <div key={hub.id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 text-sm">
            <div>
              <p className="font-medium">{hub.name}</p>
              <p className="text-slate-500">
                {hub.address} — {hub.city}
              </p>
              {hub.openingHours && <p className="text-slate-500">🕐 {hub.openingHours}</p>}
            </div>
            <button
              onClick={() => handleDeactivate(hub.id)}
              disabled={busyId === hub.id}
              className="rounded bg-red-700 px-3 py-1 text-white disabled:opacity-50"
            >
              Desativar
            </button>
          </div>
        ))}
        {hubs?.length === 0 && <p className="text-sm text-slate-500">Nenhum hub ativo.</p>}
      </div>

      <h2 className="mb-3 text-lg font-bold">Novo hub</h2>
      <form onSubmit={handleCreate} className="flex max-w-sm flex-col gap-3">
        <input
          required
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Endereço"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Cidade"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            required
            type="number"
            step="any"
            placeholder="Latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="w-1/2 rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            step="any"
            placeholder="Longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="w-1/2 rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <input
          placeholder="Horário (ex: 09:00 - 18:00)"
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? 'Criando...' : 'Criar hub'}
        </button>
      </form>
    </main>
  );
}

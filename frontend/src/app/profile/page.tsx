'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { formatCpf, formatPhone } from '@/lib/format';

type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';

const PIX_KEY_TYPE_LABEL: Record<PixKeyType, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'E-mail',
  TELEFONE: 'Telefone',
  ALEATORIA: 'Chave aleatória',
};

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('CPF');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      setPixKey(user.pixKey ?? '');
      setPixKeyType(user.pixKeyType ?? 'CPF');
      setPhone(user.phone ? formatPhone(user.phone) : '');
      setCpf(user.cpf ? formatCpf(user.cpf) : '');
    }
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pixKey: pixKey || undefined,
          pixKeyType: pixKey ? pixKeyType : undefined,
          phone: phone || undefined,
          cpf: cpf || undefined,
        }),
      });
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold">Meu perfil</h1>
      <p className="mb-6 text-sm text-slate-600">
        Sua chave PIX é usada pra receber pagamentos quando você vender um produto.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm font-medium">
          Telefone
          <input
            type="text"
            placeholder="(19) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          CPF
          <input
            type="text"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>

        <fieldset className="text-sm font-medium">
          <legend>Tipo de chave PIX</legend>
          <div className="mt-1 flex flex-col gap-1 font-normal">
            {(Object.keys(PIX_KEY_TYPE_LABEL) as PixKeyType[]).map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={pixKeyType === type}
                  onChange={() => setPixKeyType(type)}
                />
                {PIX_KEY_TYPE_LABEL[type]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="text-sm font-medium">
          Chave PIX
          <input
            type="text"
            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">Salvo com sucesso.</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </main>
  );
}

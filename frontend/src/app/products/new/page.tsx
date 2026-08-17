'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiUpload, ApiError } from '@/lib/api';
import {
  CATEGORY_LABEL,
  CONDITION_LABEL,
  Product,
  ProductCategory,
  ProductCondition,
} from '@/lib/catalog';

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ProductCategory[];
const CONDITIONS = Object.keys(CONDITION_LABEL) as ProductCondition[];

export default function NewProductPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>('CELULAR');
  const [condition, setCondition] = useState<ProductCondition>('SEMINOVO');
  const [priceAsking, setPriceAsking] = useState('');
  const [city, setCity] = useState('');
  const [acceptedCategories, setAcceptedCategories] = useState<ProductCategory[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  function toggleAccepted(c: ProductCategory) {
    setAcceptedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function handlePhotos(e: ChangeEvent<HTMLInputElement>) {
    setPhotos(Array.from(e.target.files ?? []).slice(0, 8));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('title', title);
      formData.set('description', description);
      formData.set('category', category);
      formData.set('condition', condition);
      formData.set('priceAsking', priceAsking);
      formData.set('city', city);
      formData.set('acceptedCategories', JSON.stringify(acceptedCategories));
      photos.forEach((file) => formData.append('photos', file));

      const product = await apiUpload<Product>('/products', formData);
      router.push(`/products/${product.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o anúncio');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) return null;

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">Anunciar produto</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm font-medium">
          Título
          <input
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="text-sm font-medium">
          Descrição
          <textarea
            required
            minLength={10}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="text-sm font-medium">
          Categoria
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Condição
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as ProductCondition)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABEL[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Preço de referência (R$)
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={priceAsking}
            onChange={(e) => setPriceAsking(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="text-sm font-medium">
          Cidade
          <input
            required
            minLength={2}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
          />
        </label>

        <fieldset className="text-sm font-medium">
          <legend>Aceita em troca (opcional — vazio = aceita qualquer categoria)</legend>
          <div className="mt-1 flex flex-wrap gap-2 font-normal">
            {CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={acceptedCategories.includes(c)}
                  onChange={() => toggleAccepted(c)}
                />
                {CATEGORY_LABEL[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="text-sm font-medium">
          Fotos (até 8)
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotos}
            className="mt-1 w-full font-normal"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Publicando...' : 'Publicar anúncio'}
        </button>
      </form>
    </main>
  );
}

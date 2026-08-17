'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { CATEGORY_ICON, CATEGORY_LABEL, Product, ProductCategory } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';

interface SearchResult {
  items: Product[];
  total: number;
}

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ProductCategory[];

export default function HomePage() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const [city, setCity] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (city) params.set('city', city);
      const data = await apiFetch<SearchResult>(`/products?${params.toString()}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os produtos');
    }
  }, [q, category, city]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    load();
  }

  function handleChangeLocation(e: FormEvent) {
    e.preventDefault();
    setCity(cityInput);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <section className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">TROCAS</h1>
        <p className="mt-2 text-lg text-slate-600">
          Troque produtos com segurança, sem precisar confiar diretamente no outro usuário.
        </p>

        <form onSubmit={handleSearch} className="mx-auto mt-6 flex max-w-lg gap-2">
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
            Buscar
          </button>
        </form>

        <form onSubmit={handleChangeLocation} className="mx-auto mt-3 flex max-w-lg items-center justify-center gap-2 text-sm">
          <span className="text-slate-500">📍 {city || 'Todas as cidades'}</span>
          <input
            type="text"
            placeholder="Sua cidade"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
          <button type="submit" className="text-slate-600 underline">
            Alterar localização
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setCategory('')}
            className={`rounded-full px-3 py-1 text-sm ${category === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Todas
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-sm ${category === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {CATEGORY_ICON[c]} {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <Link
          href="/products/new"
          className="mt-6 inline-block rounded bg-green-700 px-5 py-2 font-medium text-white"
        >
          Anunciar produto
        </Link>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Ofertas próximas</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && result.items.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum produto encontrado.</p>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {result?.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-bold">Como funciona?</h2>
          <ol className="flex flex-col gap-2 text-sm text-slate-700">
            <li>1. Encontre um produto</li>
            <li>2. Proponha uma troca</li>
            <li>3. Nós verificamos os produtos</li>
            <li>4. Receba seu novo produto</li>
          </ol>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold">Troque com segurança</h2>
          <ul className="flex flex-col gap-2 text-sm text-slate-700">
            <li>✔ Inspeção dos produtos</li>
            <li>✔ Intermediação</li>
            <li>✔ Usuários avaliados</li>
            <li>✔ Hub físico</li>
            <li>✔ Rastreamento da troca</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

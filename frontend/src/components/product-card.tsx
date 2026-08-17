import Link from 'next/link';
import { CATEGORY_LABEL, formatBRL, Product } from '@/lib/catalog';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="flex flex-col overflow-hidden rounded border border-slate-200 bg-white transition hover:shadow-md"
    >
      <div className="aspect-square w-full bg-slate-100">
        {product.photoUrls[0] ? (
          <img
            src={product.photoUrls[0]}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            Sem foto
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <span className="text-xs font-medium text-slate-500">{CATEGORY_LABEL[product.category]}</span>
        <h3 className="truncate font-semibold">{product.title}</h3>
        <p className="font-bold">{formatBRL(product.priceAsking)}</p>
        <p className="text-xs text-slate-500">📍 {product.city}</p>
        <span className="mt-1 inline-block w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Aceita trocas
        </span>
      </div>
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Item {
  href: string;
  label: string;
  comingSoon?: boolean;
}

const ITEMS: Item[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Usuários' },
  { href: '/admin/products', label: 'Produtos', comingSoon: true },
  { href: '/admin/negotiations', label: 'Trocas' },
  { href: '/admin/negotiations?status=EM_ANALISE', label: 'Disputas' },
  { href: '/admin/inspections', label: 'Inspeções', comingSoon: true },
  { href: '/admin/hubs', label: 'Hubs' },
  { href: '/admin/payments', label: 'Pagamentos' },
  { href: '/admin/platform-fees', label: 'Taxas' },
  { href: '/admin/shipping', label: 'Fretes' },
  { href: '/admin/reports', label: 'Relatórios', comingSoon: true },
  { href: '/admin/settings', label: 'Configurações', comingSoon: true },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r border-slate-200 bg-white">
      <nav className="flex flex-col gap-1 p-4 text-sm">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Admin
        </p>
        {ITEMS.map((item) => {
          if (item.comingSoon) {
            return (
              <span
                key={item.label}
                className="flex items-center justify-between rounded px-3 py-2 text-slate-300"
              >
                {item.label}
                <span className="text-[10px]">em breve</span>
              </span>
            );
          }
          const basePath = item.href.split('?')[0];
          const active = pathname === basePath;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-3 py-2 ${
                active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

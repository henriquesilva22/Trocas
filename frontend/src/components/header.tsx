'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  // Painel do técnico tem a própria nav (components/technician-nav.tsx) —
  // deliberadamente uma interface separada da UI de usuário (item 11).
  if (pathname?.startsWith('/technician')) return null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-bold tracking-tight">
          Troca Segura
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {loading ? null : user ? (
            <>
              <span className="text-slate-500">Olá, {user.name}</span>
              <Link href="/products/new" className="hover:underline">
                Anunciar
              </Link>
              <Link href="/negotiations" className="hover:underline">
                Minhas negociações
              </Link>
              <Link href="/profile" className="hover:underline">
                Perfil
              </Link>
              {user.role === 'ADMIN' && (
                <Link href="/admin" className="hover:underline">
                  Admin
                </Link>
              )}
              {user.role === 'TECHNICIAN' && (
                <Link href="/technician/queue" className="hover:underline">
                  Painel do Hub
                </Link>
              )}
              <button onClick={logout} className="text-slate-500 hover:underline">
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Entrar
              </Link>
              <Link href="/register" className="hover:underline">
                Cadastrar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

/**
 * Nav própria do painel do técnico — deliberadamente diferente da UI de
 * usuário (não reaproveita components/header.tsx).
 */
export function TechnicianNav() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/technician/queue" className="font-bold tracking-tight">
          Painel do Hub
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/technician/queue" className="hover:underline">
            Fila
          </Link>
          {user && <span className="text-slate-400">{user.name}</span>}
          <button onClick={logout} className="text-slate-400 hover:underline">
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}

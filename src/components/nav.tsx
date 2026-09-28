'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/client/api';

export function Nav({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/transactions', label: 'Transações' },
    { href: '/classes', label: 'Classes' },
    ...(isAdmin ? [{ href: '/admin/users', label: 'Usuários' }] : []),
  ];

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-emerald-700">FinanceBoard</span>
          <nav className="flex gap-1">
            {links.map((l) => {
              const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">{name}</span>
          <button onClick={logout} className="font-medium text-slate-600 hover:text-slate-900 hover:underline">
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

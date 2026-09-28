'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client/api';
import { btnPrimary, ErrorBox, Field, inputCls } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/auth/login', { method: 'POST', json: { email, password } });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-emerald-700">FinanceBoard</h1>
          <p className="mt-1 text-sm text-slate-500">Entre para gerenciar suas finanças</p>
        </div>
        <ErrorBox message={error} />
        <Field label="E-mail">
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Senha">
          <input
            type="password"
            required
            autoComplete="current-password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { btnLink, btnPrimary, ErrorBox } from './ui';

export function TelegramSettings() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: { token: string } }>('/telegram/connect', { method: 'POST' });
      setToken(res.data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar código.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!token) return;
    await navigator.clipboard.writeText(`/start ${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Telegram</h2>
      <p className="mt-1 text-sm text-slate-500">
        Conecte sua conta para registrar transações e consultar o resumo mensal diretamente pelo
        Telegram.
      </p>

      <div className="mt-4">
        <ErrorBox message={error} />
      </div>

      {!token ? (
        <button className={`mt-4 ${btnPrimary}`} onClick={generate} disabled={loading}>
          {loading ? 'Gerando…' : 'Gerar código de conexão'}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            Envie o comando abaixo para o seu bot no Telegram. O código expira em{' '}
            <strong>10 minutos</strong>.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <code className="flex-1 text-sm text-slate-800">/start {token}</code>
            <button
              onClick={copy}
              className="shrink-0 text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <button
            className={btnLink}
            onClick={() => {
              setToken(null);
              setError(null);
            }}
          >
            Gerar novo código
          </button>
        </div>
      )}

      <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
        <p className="font-medium text-slate-700">Comandos disponíveis após conectar:</p>
        <ul className="mt-1 space-y-1">
          <li>
            <code className="text-slate-800">/dashboard</code> — resumo do mês atual
          </li>
          <li>
            <code className="text-slate-800">/registrar [descrição] [valor] [categoria]</code> —
            nova transação
          </li>
        </ul>
      </div>
    </div>
  );
}

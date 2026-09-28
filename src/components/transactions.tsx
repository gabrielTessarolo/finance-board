'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/client/api';
import {
  CLASS_TYPE_LABELS,
  currentMonth,
  formatBRL,
  formatDate,
  formatMonth,
  shiftMonth,
  todayISO,
} from '@/lib/format';
import type { ItemClassDto, SummaryDto, TransactionDto } from '@/lib/types';
import { CsvImportModal } from './csv-import-modal';
import { TransactionForm } from './transaction-form';
import { btnLink, btnLinkDanger, btnPrimary, btnSecondary, ErrorBox, PageHeader } from './ui';

type FormState = { transaction?: TransactionDto } | null;

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' | 'slate' | 'blue' }) {
  const color = { green: 'text-emerald-700', red: 'text-red-600', slate: 'text-slate-900', blue: 'text-sky-700' }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{formatBRL(value)}</div>
    </div>
  );
}

export function Transactions() {
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(() => {
    const m = searchParams.get('month');
    return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : currentMonth();
  });
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [summary, setSummary] = useState<SummaryDto | null>(null);
  const [classes, setClasses] = useState<ItemClassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  function changeMonth(next: string) {
    setLoading(true);
    setMonth(next);
  }

  useEffect(() => {
    api<{ data: ItemClassDto[] }>('/classes')
      .then((r) => setClasses(r.data))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ data: TransactionDto[] }>(`/transactions?month=${month}&limit=1000`),
      api<{ data: SummaryDto }>(`/transactions/summary?month=${month}`),
    ])
      .then(([t, s]) => {
        if (cancelled) return;
        setTransactions(t.data);
        setSummary(s.data);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month, reloadKey]);

  async function remove(t: TransactionDto) {
    if (!window.confirm(`Excluir "${t.description}"?`)) return;
    try {
      await api(`/transactions/${t.id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir.');
    }
  }

  // Data sugerida no formulário: hoje, se estiver no mês exibido; senão, o dia 1 do mês.
  const today = todayISO();
  const defaultDate = today.startsWith(month) ? today : `${month}-01`;

  return (
    <>
      <PageHeader
        title="Transações"
        action={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={() => setShowCsvImport(true)} disabled={classes.length === 0}>
              Importar CSV
            </button>
            <button className={btnPrimary} onClick={() => setForm({})} disabled={classes.length === 0}>
              + Nova transação
            </button>
          </div>
        }
      />

      <div className="mb-6 flex items-center gap-2">
        <button className={btnSecondary} onClick={() => changeMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
          ←
        </button>
        <div className="min-w-44 text-center text-lg font-medium">{formatMonth(month)}</div>
        <button className={btnSecondary} onClick={() => changeMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
          →
        </button>
        {month !== currentMonth() && (
          <button className={btnLink} onClick={() => changeMonth(currentMonth())}>
            Visualizar mês atual
          </button>
        )}
      </div>

      <ErrorBox message={error} />

      <div className="mb-6 mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Receitas" value={summary?.receipts ?? 0} tone="green" />
        <SummaryCard label="Despesas" value={summary?.expenses ?? 0} tone="red" />
        <SummaryCard label="Saldo" value={summary?.balance ?? 0} tone={(summary?.balance ?? 0) < 0 ? 'red' : 'slate'} />
        <SummaryCard label="Transferências internas" value={summary?.transfers ?? 0} tone="blue" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Classe</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((t) => {
              const transfer = t.classification?.type === 'TRANSFERENCIA_INTERNA';
              const receipt = !transfer && t.classification?.isReceipt;
              const tone = transfer ? 'text-sky-700' : receipt ? 'text-emerald-700' : 'text-red-600';
              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(t.transactionDate)}</td>
                  <td className="px-4 py-3">{t.description}</td>
                  <td className="px-4 py-3">
                    <div>{t.classification?.name}</div>
                    <div className="text-xs text-slate-400">
                      {t.classification && CLASS_TYPE_LABELS[t.classification.type]}
                    </div>
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-medium ${tone}`}>
                    {receipt ? '+' : transfer ? '' : '−'} {formatBRL(t.value)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button className={btnLink} onClick={() => setForm({ transaction: t })}>
                      Editar
                    </button>
                    <span className="mx-2 text-slate-300">|</span>
                    <button className={btnLinkDanger} onClick={() => remove(t)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Nenhuma transação neste mês.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Carregando…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCsvImport && (
        <CsvImportModal
          classes={classes}
          onClose={() => setShowCsvImport(false)}
          onImported={reload}
        />
      )}

      {form && (
        <TransactionForm
          classes={classes}
          transaction={form.transaction}
          defaultDate={defaultDate}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      )}
    </>
  );
}

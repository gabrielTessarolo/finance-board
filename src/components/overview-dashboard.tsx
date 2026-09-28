'use client';

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/client/api';
import { currentMonth, formatBRL, formatMonth, shiftMonth } from '@/lib/format';
import type { SummaryDto } from '@/lib/types';
import { ErrorBox, PageHeader } from './ui';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#6366f1', '#ec4899', '#14b8a6',
  '#f43f5e', '#84cc16',
];

function getLast6Months(): string[] {
  const now = currentMonth();
  return Array.from({ length: 6 }, (_, i) => shiftMonth(now, i - 5));
}

function shortMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'short',
    timeZone: 'UTC',
  });
  return label.replace('.', '') + '/' + String(y).slice(2);
}

function tickY(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

interface MonthData {
  month: string;
  summary: SummaryDto | null;
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' | 'slate' }) {
  const color = { green: 'text-emerald-700', red: 'text-red-600', slate: 'text-slate-900' }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export function OverviewDashboard() {
  const router = useRouter();
  const [monthData, setMonthData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const months = getLast6Months();
    Promise.allSettled(
      months.map(m => api<{ data: SummaryDto }>(`/transactions/summary?month=${m}`))
    ).then(results => {
      if (cancelled) return;
      setMonthData(
        results.map((r, i) => ({
          month: months[i],
          summary: r.status === 'fulfilled' ? r.value.data : null,
        }))
      );
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError('Erro ao carregar dados.');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const expenseCategories = useMemo(() => {
    const seen = new Map<string, string>();
    monthData.forEach(({ summary }) => {
      summary?.byClass
        .filter(c => !c.isReceipt && c.type !== 'TRANSFERENCIA_INTERNA')
        .forEach(c => seen.set(c.classificationId, c.name));
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [monthData]);

  const barData = useMemo(() =>
    monthData.map(({ month, summary }) => {
      const entry: Record<string, string | number> = {
        monthKey: month,
        month: shortMonth(month),
      };
      expenseCategories.forEach(({ id, name }) => {
        const cat = summary?.byClass.find(c => c.classificationId === id);
        entry[name] = cat?.total ?? 0;
      });
      return entry;
    }), [monthData, expenseCategories]);

  const lineData = useMemo(() =>
    monthData.map(({ month, summary }) => ({
      monthKey: month,
      month: shortMonth(month),
      Receitas: summary?.receipts ?? 0,
      Despesas: summary?.expenses ?? 0,
    })), [monthData]);

  const totals = useMemo(() =>
    monthData.reduce(
      (acc, { summary }) => ({
        receipts: acc.receipts + (summary?.receipts ?? 0),
        expenses: acc.expenses + (summary?.expenses ?? 0),
        balance: acc.balance + (summary?.balance ?? 0),
      }),
      { receipts: 0, expenses: 0, balance: 0 }
    ), [monthData]);

  const savingsRate = totals.receipts > 0
    ? Math.round((totals.balance / totals.receipts) * 100)
    : null;

  const hasData = monthData.some(d => d.summary !== null);
  const allFailed = !loading && monthData.length > 0 && monthData.every(d => d.summary === null);

  function handleChartClick(data: unknown) {
    const d = data as { activePayload?: Array<{ payload: Record<string, unknown> }> } | null;
    const monthKey = d?.activePayload?.[0]?.payload?.monthKey as string | undefined;
    if (monthKey) router.push(`/transactions?month=${monthKey}`);
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <ErrorBox message={error} />

      {/* KPI — totais dos últimos 6 meses */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Receitas (6 meses)" value={formatBRL(totals.receipts)} tone="green" />
        <KpiCard label="Despesas (6 meses)" value={formatBRL(totals.expenses)} tone="red" />
        <KpiCard
          label="Saldo (6 meses)"
          value={formatBRL(totals.balance)}
          tone={totals.balance < 0 ? 'red' : 'slate'}
        />
        <KpiCard
          label="Taxa de poupança"
          value={savingsRate !== null ? `${savingsRate}%` : '—'}
          tone={savingsRate === null ? 'slate' : savingsRate < 0 ? 'red' : 'green'}
        />
      </div>

      {allFailed ? (
        <div className="rounded-xl border border-slate-200 bg-white p-16 text-center text-slate-500">
          Não foi possível carregar os dados. Verifique sua conexão e tente novamente.
        </div>
      ) : !hasData ? (
        <div className="rounded-xl border border-slate-200 bg-white p-16 text-center text-slate-500">
          Nenhuma transação encontrada nos últimos 6 meses.{' '}
          <Link href="/transactions" className="font-medium text-emerald-700 hover:underline">
            Adicionar transações
          </Link>
        </div>
      ) : (
        <>
          {/* Gráfico de barras — despesas por categoria */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm font-medium text-slate-500">
              Despesas por categoria · clique num mês para ver as transações
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={tickY} tick={{ fontSize: 12 }} width={48} />
                <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {expenseCategories.map(({ name }, idx) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="a"
                    fill={COLORS[idx % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de linhas — receitas × despesas */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm font-medium text-slate-500">
              Receitas × Despesas · clique num mês para ver as transações
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={tickY} tick={{ fontSize: 12 }} width={48} />
                <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="Receitas"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Despesas"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela mês a mês */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Mês</th>
                  <th className="px-4 py-3 text-right font-medium">Receitas</th>
                  <th className="px-4 py-3 text-right font-medium">Despesas</th>
                  <th className="px-4 py-3 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...monthData].reverse().map(({ month, summary }) => (
                  <tr key={month} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/transactions?month=${month}`}
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        {formatMonth(month)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {formatBRL(summary?.receipts ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatBRL(summary?.expenses ?? 0)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${(summary?.balance ?? 0) < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {formatBRL(summary?.balance ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

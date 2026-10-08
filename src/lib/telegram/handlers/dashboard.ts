import 'server-only';
import { createBearerClient } from '@/lib/supabase/clients';
import { currentMonth, formatBRL, formatMonth, monthRange } from '@/lib/format';
import type { ClassType } from '@/lib/types';

interface SummaryRow {
  classification_id: string;
  name: string;
  type: ClassType;
  is_receipt: boolean;
  total: number;
}

export async function handleDashboard(accessToken: string): Promise<string> {
  const supabase = createBearerClient(accessToken);
  const month = currentMonth();
  const { from, to } = monthRange(month);

  const { data, error } = await supabase.rpc('transaction_summary', { p_from: from, p_to: to });

  if (error) {
    console.error('[telegram/dashboard] erro:', error);
    return 'Não foi possível carregar o resumo. Tente novamente.';
  }

  const rows = (data ?? []) as SummaryRow[];
  let receipts = 0;
  let expenses = 0;
  for (const r of rows) {
    if (r.type === 'TRANSFERENCIA_INTERNA') continue;
    const total = Number(r.total);
    if (r.is_receipt) receipts += total;
    else expenses += total;
  }
  const balance = receipts - expenses;
  const round = (n: number) => Math.round(n * 100) / 100;

  const lines = [
    `📊 *${formatMonth(month)}*`,
    '',
    `✅ Receitas: ${formatBRL(round(receipts))}`,
    `❌ Despesas: ${formatBRL(round(expenses))}`,
    `${balance >= 0 ? '💰' : '⚠️'} Saldo: ${formatBRL(round(balance))}`,
  ];

  const topExpenses = rows
    .filter((r) => !r.is_receipt && r.type !== 'TRANSFERENCIA_INTERNA')
    .slice(0, 5);

  if (topExpenses.length > 0) {
    lines.push('', '*Principais despesas:*');
    for (const r of topExpenses) {
      lines.push(`  • ${r.name}: ${formatBRL(Number(r.total))}`);
    }
  }

  return lines.join('\n');
}

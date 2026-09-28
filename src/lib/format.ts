import type { ClassType } from './types';

export const APP_TIMEZONE = 'America/Sao_Paulo';

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  RECEITA: 'Receita',
  DESPESA_ESSENCIAL: 'Despesa essencial',
  DESPESA_NAO_ESSENCIAL: 'Despesa não essencial',
  OUTRAS_DESPESAS: 'Outras despesas',
  TRANSFERENCIA_INTERNA: 'Transferência interna',
};

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(value: number): string {
  return brl.format(value);
}

/** Data de hoje (YYYY-MM-DD) no fuso do app. */
export function todayISO(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: APP_TIMEZONE });
}

/** Mês atual (YYYY-MM) no fuso do app. */
export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

/** Primeiro e último dia de um mês YYYY-MM. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

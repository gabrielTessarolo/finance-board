import type { SupabaseClient } from '@supabase/supabase-js';
import { currentMonth, monthRange } from '@/lib/format';
import { badRequest, fromDb, notFound } from '../errors';
import { toUserDto, USER_COLUMNS, type UserRow } from '../mappers';

export async function fetchProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select(USER_COLUMNS)
    .eq('id', userId)
    .maybeSingle<UserRow>();
  if (error) throw fromDb(error);
  if (!data) throw notFound('Usuário');
  return toUserDto(data);
}

/** Resolve o período a partir de month ou from/to. */
export function resolveRange(
  q: { month?: string; from?: string; to?: string },
  defaultToCurrentMonth: boolean,
): { from?: string; to?: string } {
  if (q.month && (q.from || q.to)) {
    throw badRequest('Use "month" ou "from"/"to", não ambos.');
  }
  if (q.month) return monthRange(q.month);
  if (q.from && q.to && q.from > q.to) throw badRequest('"from" deve ser anterior ou igual a "to".');
  if (!q.from && !q.to && defaultToCurrentMonth) return monthRange(currentMonth());
  return { from: q.from, to: q.to };
}

export function searchParamsObject(req: { nextUrl: { searchParams: URLSearchParams } }) {
  return Object.fromEntries(req.nextUrl.searchParams);
}

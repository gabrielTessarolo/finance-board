import type { SupabaseClient } from '@supabase/supabase-js';
import { todayISO } from '@/lib/format';
import type { ClassType, SummaryDto } from '@/lib/types';
import { badRequest, fromDb, notFound } from '../errors';
import { toTransactionDto, TRANSACTION_SELECT, type TransactionRow } from '../mappers';
import { readJson, type ApiHandler } from '../route';
import {
  summaryQuerySchema,
  transactionCreateSchema,
  transactionListQuerySchema,
  transactionUpdateSchema,
} from '../schemas';
import { resolveRange, searchParamsObject } from './common';

/** A classe precisa existir e estar visível ao usuário (padrão ou própria). */
async function assertClassVisible(supabase: SupabaseClient, classificationId: string) {
  const { data, error } = await supabase
    .from('items_classes')
    .select('id')
    .eq('id', classificationId)
    .maybeSingle();
  if (error) throw fromDb(error);
  if (!data) throw badRequest('Classificação inválida.');
}

export const list: ApiHandler = async (req, { supabase, user }) => {
  const q = transactionListQuerySchema.parse(searchParamsObject(req));
  const { from, to } = resolveRange(q, false);
  const limit = q.limit ?? 100;
  const offset = q.offset ?? 0;

  let query = supabase
    .from('transaction_items')
    .select(TRANSACTION_SELECT, { count: 'exact' })
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (from) query = query.gte('transaction_date', from);
  if (to) query = query.lte('transaction_date', to);
  if (q.classificationId) query = query.eq('classification_id', q.classificationId);

  const { data, error, count } = await query.overrideTypes<TransactionRow[], { merge: false }>();
  if (error) {
    // Página além do fim do resultado
    if (error.code === 'PGRST103') {
      return Response.json({ data: [], meta: { total: count ?? 0, limit, offset } });
    }
    throw fromDb(error);
  }
  return Response.json({
    data: data.map(toTransactionDto),
    meta: { total: count ?? data.length, limit, offset },
  });
};

export const create: ApiHandler = async (req, { supabase, user }) => {
  const input = await readJson(req, transactionCreateSchema);
  await assertClassVisible(supabase, input.classificationId);

  const { data, error } = await supabase
    .from('transaction_items')
    .insert({
      description: input.description,
      classification_id: input.classificationId,
      value: input.value,
      transaction_date: input.transactionDate ?? todayISO(),
      custom_data: input.customData ?? {},
      user_id: user.id,
    })
    .select(TRANSACTION_SELECT)
    .single<TransactionRow>();
  if (error) throw fromDb(error);
  return Response.json({ data: toTransactionDto(data) }, { status: 201 });
};

export const get: ApiHandler = async (_req, { supabase, user, params }) => {
  const { data, error } = await supabase
    .from('transaction_items')
    .select(TRANSACTION_SELECT)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle<TransactionRow>();
  if (error) throw fromDb(error);
  if (!data) throw notFound('Transação');
  return Response.json({ data: toTransactionDto(data) });
};

export const update: ApiHandler = async (req, { supabase, user, params }) => {
  const input = await readJson(req, transactionUpdateSchema);
  if (input.classificationId) await assertClassVisible(supabase, input.classificationId);

  const patch: Record<string, unknown> = {};
  if (input.description !== undefined) patch.description = input.description;
  if (input.classificationId !== undefined) patch.classification_id = input.classificationId;
  if (input.value !== undefined) patch.value = input.value;
  if (input.transactionDate !== undefined) patch.transaction_date = input.transactionDate;
  if (input.customData !== undefined) patch.custom_data = input.customData;

  const { data, error } = await supabase
    .from('transaction_items')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select(TRANSACTION_SELECT)
    .maybeSingle<TransactionRow>();
  if (error) throw fromDb(error);
  if (!data) throw notFound('Transação');
  return Response.json({ data: toTransactionDto(data) });
};

export const remove: ApiHandler = async (_req, { supabase, user, params }) => {
  const { data, error } = await supabase
    .from('transaction_items')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('id');
  if (error) throw fromDb(error);
  if (!data || data.length === 0) throw notFound('Transação');
  return new Response(null, { status: 204 });
};

interface SummaryRow {
  classification_id: string;
  name: string;
  type: ClassType;
  is_receipt: boolean;
  total: number;
  count: number;
}

/**
 * Totais do período. Transferências internas ficam fora de receitas/despesas
 * (não alteram o patrimônio) e são reportadas à parte em `transfers`.
 */
export const summary: ApiHandler = async (req, { supabase }) => {
  const q = summaryQuerySchema.parse(searchParamsObject(req));
  const { from, to } = resolveRange(q, true);
  if (!from || !to) throw badRequest('Informe "month" ou "from" e "to".');

  const { data, error } = await supabase.rpc('transaction_summary', { p_from: from, p_to: to });
  if (error) throw fromDb(error);

  const rows = (data ?? []) as SummaryRow[];
  let receipts = 0;
  let expenses = 0;
  let transfers = 0;
  for (const r of rows) {
    const total = Number(r.total);
    if (r.type === 'TRANSFERENCIA_INTERNA') transfers += total;
    else if (r.is_receipt) receipts += total;
    else expenses += total;
  }
  const round = (n: number) => Math.round(n * 100) / 100;

  const body: SummaryDto = {
    from,
    to,
    receipts: round(receipts),
    expenses: round(expenses),
    balance: round(receipts - expenses),
    transfers: round(transfers),
    byClass: rows.map((r) => ({
      classificationId: r.classification_id,
      name: r.name,
      type: r.type,
      isReceipt: r.is_receipt,
      total: Number(r.total),
      count: Number(r.count),
    })),
  };
  return Response.json({ data: body });
};

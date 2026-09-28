import type { SupabaseClient } from '@supabase/supabase-js';
import { conflict, forbidden, fromDb, notFound } from '../errors';
import { CLASS_COLUMNS, toClassDto, type ClassRow } from '../mappers';
import { readJson, type ApiHandler } from '../route';
import { classCreateSchema, classListQuerySchema, classUpdateSchema } from '../schemas';
import { searchParamsObject } from './common';

const NAME_TAKEN = 'Já existe uma classe com este nome.';

/** Nomes das classes padrão não podem ser reutilizados (o índice único só cobre o próprio usuário). */
async function assertNameNotDefault(supabase: SupabaseClient, name: string) {
  const { data, error } = await supabase.from('items_classes').select('name').eq('is_default', true);
  if (error) throw fromDb(error);
  const wanted = name.trim().toLowerCase();
  if (data?.some((c) => String(c.name).toLowerCase() === wanted)) throw conflict(NAME_TAKEN);
}

/** Busca uma classe visível e garante que pertence ao usuário (não é padrão). */
async function getOwnClass(supabase: SupabaseClient, id: string): Promise<ClassRow> {
  const { data, error } = await supabase
    .from('items_classes')
    .select(CLASS_COLUMNS)
    .eq('id', id)
    .maybeSingle<ClassRow>();
  if (error) throw fromDb(error);
  if (!data) throw notFound('Classe');
  if (data.is_default) throw forbidden('Classes padrão não podem ser alteradas ou excluídas.');
  return data;
}

function writeError(error: { code?: string; message: string }) {
  return error.code === '23505' ? conflict(NAME_TAKEN) : fromDb(error);
}

export const list: ApiHandler = async (req, { supabase }) => {
  const q = classListQuerySchema.parse(searchParamsObject(req));
  let query = supabase
    .from('items_classes')
    .select(CLASS_COLUMNS)
    .order('is_default', { ascending: false })
    .order('type')
    .order('name');
  if (q.type) query = query.eq('type', q.type);
  const { data, error } = await query.overrideTypes<ClassRow[], { merge: false }>();
  if (error) throw fromDb(error);
  return Response.json({ data: data.map(toClassDto) });
};

export const create: ApiHandler = async (req, { supabase, user }) => {
  const input = await readJson(req, classCreateSchema);
  await assertNameNotDefault(supabase, input.name);
  const { data, error } = await supabase
    .from('items_classes')
    .insert({
      name: input.name,
      type: input.type,
      is_receipt: input.isReceipt,
      is_default: false,
      user_id: user.id,
    })
    .select(CLASS_COLUMNS)
    .single<ClassRow>();
  if (error) throw writeError(error);
  return Response.json({ data: toClassDto(data) }, { status: 201 });
};

export const get: ApiHandler = async (_req, { supabase, params }) => {
  const { data, error } = await supabase
    .from('items_classes')
    .select(CLASS_COLUMNS)
    .eq('id', params.id)
    .maybeSingle<ClassRow>();
  if (error) throw fromDb(error);
  if (!data) throw notFound('Classe');
  return Response.json({ data: toClassDto(data) });
};

export const update: ApiHandler = async (req, { supabase, params }) => {
  const input = await readJson(req, classUpdateSchema);
  const current = await getOwnClass(supabase, params.id);
  if (input.name !== undefined && input.name.toLowerCase() !== current.name.toLowerCase()) {
    await assertNameNotDefault(supabase, input.name);
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.type !== undefined) patch.type = input.type;
  if (input.isReceipt !== undefined) patch.is_receipt = input.isReceipt;

  const { data, error } = await supabase
    .from('items_classes')
    .update(patch)
    .eq('id', params.id)
    .select(CLASS_COLUMNS)
    .maybeSingle<ClassRow>();
  if (error) throw writeError(error);
  if (!data) throw notFound('Classe');
  return Response.json({ data: toClassDto(data) });
};

export const remove: ApiHandler = async (_req, { supabase, params }) => {
  await getOwnClass(supabase, params.id);
  const { error } = await supabase.from('items_classes').delete().eq('id', params.id);
  if (error) {
    if (error.code === '23503') {
      throw conflict('Esta classe está em uso por transações e não pode ser excluída.');
    }
    throw fromDb(error);
  }
  return new Response(null, { status: 204 });
};

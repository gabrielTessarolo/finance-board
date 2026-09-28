import type { SupabaseClient } from '@supabase/supabase-js';
import { badRequest, conflict, forbidden, fromDb, notFound } from '../errors';
import { toUserDto, USER_COLUMNS, type UserRow } from '../mappers';
import { readJson, type ApiContext, type ApiHandler } from '../route';
import { userCreateSchema, userUpdateSchema } from '../schemas';
import { createServiceClient } from '@/lib/supabase/clients';
import { fetchProfile } from './common';

/** Só admin gerencia usuários. O papel é lido do banco (RLS: o usuário lê o próprio perfil). */
async function requireAdmin({ supabase, user }: ApiContext) {
  const me = await fetchProfile(supabase, user.id);
  if (me.role !== 'admin') throw forbidden('Apenas administradores podem gerenciar usuários.');
  return me;
}

async function findUser(admin: SupabaseClient, id: string): Promise<UserRow> {
  const { data, error } = await admin.from('users').select(USER_COLUMNS).eq('id', id).maybeSingle<UserRow>();
  if (error) throw fromDb(error);
  if (!data) throw notFound('Usuário');
  return data;
}

function authAdminError(error: { code?: string; message: string; status?: number }) {
  if (error.code === 'email_exists' || error.code === 'user_already_exists') {
    return conflict('Já existe um usuário com este e-mail.');
  }
  if (error.code === 'weak_password') return badRequest('Senha fraca. Use uma senha mais forte.');
  if (error.code === 'user_not_found') return notFound('Usuário');
  console.error('[auth-admin]', error);
  return new Error('Erro ao acessar o serviço de autenticação.');
}

export const list: ApiHandler = async (_req, ctx) => {
  await requireAdmin(ctx);
  const admin = createServiceClient();
  const { data, error } = await admin
    .from('users')
    .select(USER_COLUMNS)
    .order('created_at')
    .overrideTypes<UserRow[], { merge: false }>();
  if (error) throw fromDb(error);
  return Response.json({ data: data.map(toUserDto) });
};

export const get: ApiHandler = async (_req, ctx) => {
  await requireAdmin(ctx);
  return Response.json({ data: toUserDto(await findUser(createServiceClient(), ctx.params.id)) });
};

export const create: ApiHandler = async (req, ctx) => {
  await requireAdmin(ctx);
  const input = await readJson(req, userCreateSchema);
  const admin = createServiceClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  });
  if (error || !data.user) throw authAdminError(error ?? { message: 'sem usuário' });

  // O trigger on_auth_user_created cria o perfil com o nome informado.
  return Response.json({ data: toUserDto(await findUser(admin, data.user.id)) }, { status: 201 });
};

export const update: ApiHandler = async (req, ctx) => {
  await requireAdmin(ctx);
  const input = await readJson(req, userUpdateSchema);
  const admin = createServiceClient();
  const current = await findUser(admin, ctx.params.id);

  if (input.email !== undefined || input.password !== undefined || input.name !== undefined) {
    const { error } = await admin.auth.admin.updateUserById(current.id, {
      ...(input.email !== undefined ? { email: input.email, email_confirm: true } : {}),
      ...(input.password !== undefined ? { password: input.password } : {}),
      ...(input.name !== undefined ? { user_metadata: { name: input.name } } : {}),
    });
    if (error) throw authAdminError(error);
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.email !== undefined) patch.email = input.email;
  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from('users').update(patch).eq('id', current.id);
    if (error) throw fromDb(error);
  }
  return Response.json({ data: toUserDto(await findUser(admin, current.id)) });
};

/** Exclui o usuário no Auth; transações e classes dele caem em cascata. */
export const remove: ApiHandler = async (_req, ctx) => {
  const me = await requireAdmin(ctx);
  const admin = createServiceClient();
  const target = await findUser(admin, ctx.params.id);
  if (target.id === me.id) throw badRequest('Você não pode excluir a própria conta.');
  if (target.role === 'admin') throw forbidden('Administradores não podem ser excluídos por aqui.');

  const { error } = await admin.auth.admin.deleteUser(target.id);
  if (error) throw authAdminError(error);
  return new Response(null, { status: 204 });
};

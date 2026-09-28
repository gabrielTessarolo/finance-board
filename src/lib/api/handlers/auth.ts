import type { Session } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { createAnonClient, createSessionClient } from '@/lib/supabase/clients';
import { ApiError, unauthorized } from '../errors';
import { readJson, type ApiHandler } from '../route';
import { loginSchema, refreshSchema } from '../schemas';
import { fetchProfile } from './common';

const INVALID_CREDENTIALS = 'E-mail ou senha inválidos.';

/** Separa erro de credencial (401) de falha de conexão/configuração com o Supabase (502). */
function signInFailure(error: { name?: string; status?: number; code?: string }) {
  if (error.code === 'email_not_confirmed') return unauthorized('E-mail ainda não confirmado.');
  const unreachable =
    error.name === 'AuthRetryableFetchError' ||
    error.name === 'AuthUnknownError' ||
    (error.status !== undefined && error.status >= 500);
  if (unreachable) {
    console.error('[auth] falha ao contatar o Supabase:', error);
    return new ApiError(
      502,
      'auth_unavailable',
      'Não foi possível contatar o Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no .env.local.',
    );
  }
  return unauthorized(INVALID_CREDENTIALS);
}

/** /api/auth/login: abre a sessão em cookie (front). */
export async function login(req: NextRequest) {
  const { email, password } = await readJson(req, loginSchema);
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw signInFailure(error);
  if (!data.user) throw unauthorized(INVALID_CREDENTIALS);

  try {
    return Response.json({ data: await fetchProfile(supabase, data.user.id) });
  } catch (e) {
    await supabase.auth.signOut();
    throw e;
  }
}

/** /api/auth/logout: encerra a sessão em cookie. */
export async function logout() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  return new Response(null, { status: 204 });
}

/** Perfil do usuário autenticado (usado por /api/auth/me e /v1/me). */
export const me: ApiHandler = async (_req, { supabase, user }) =>
  Response.json({ data: await fetchProfile(supabase, user.id) });

function tokenResponse(session: Session) {
  return Response.json({
    data: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      tokenType: 'Bearer',
      expiresIn: session.expires_in,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    },
  });
}

/** /v1/auth/token: e-mail + senha -> Bearer token. */
export async function issueToken(req: NextRequest) {
  const { email, password } = await readJson(req, loginSchema);
  const { data, error } = await createAnonClient().auth.signInWithPassword({ email, password });
  if (error) throw signInFailure(error);
  if (!data.session) throw unauthorized(INVALID_CREDENTIALS);
  return tokenResponse(data.session);
}

/** /v1/auth/refresh: renova o token com o refresh token. */
export async function refreshToken(req: NextRequest) {
  const { refreshToken } = await readJson(req, refreshSchema);
  const { data, error } = await createAnonClient().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) throw unauthorized('Refresh token inválido ou expirado.');
  return tokenResponse(data.session);
}

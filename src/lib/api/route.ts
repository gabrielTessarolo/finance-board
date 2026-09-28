import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { createBearerClient, createSessionClient } from '@/lib/supabase/clients';
import { errorResponse, unauthorized } from './errors';

export interface AuthUser {
  id: string;
  email: string;
}

export interface ApiContext {
  supabase: SupabaseClient;
  user: AuthUser;
  params: Record<string, string>;
}

export type ApiHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

type RouteCtx = { params: Promise<Record<string, string>> };

/**
 * /api/*: autenticação pela sessão em cookie (uso interno do próprio front).
 */
export function withSession(handler: ApiHandler) {
  return async (req: NextRequest, routeCtx: RouteCtx): Promise<Response> => {
    try {
      const supabase = await createSessionClient();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw unauthorized();
      const user = { id: data.user.id, email: data.user.email ?? '' };
      return await handler(req, { supabase, user, params: await routeCtx.params });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/**
 * /v1/*: autenticação por Bearer token (uso externo/integrações).
 */
export function withBearer(handler: ApiHandler) {
  return async (req: NextRequest, routeCtx: RouteCtx): Promise<Response> => {
    try {
      const header = req.headers.get('authorization') ?? '';
      const match = /^Bearer\s+(.+)$/i.exec(header);
      if (!match) throw unauthorized('Envie o header "Authorization: Bearer <token>".');
      const supabase = createBearerClient(match[1]);
      const { data, error } = await supabase.auth.getUser(match[1]);
      if (error || !data.user) throw unauthorized('Token inválido ou expirado.');
      const user = { id: data.user.id, email: data.user.email ?? '' };
      return await handler(req, { supabase, user, params: await routeCtx.params });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/** Rotas públicas (login): apenas tratamento de erro. */
export function publicRoute(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      return await handler(req);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/** Lê e valida o corpo JSON. */
export async function readJson<T>(req: NextRequest, schema: { parse(data: unknown): T }): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = undefined;
  }
  return schema.parse(body);
}

import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

const url = () => env('NEXT_PUBLIC_SUPABASE_URL');
const anonKey = () => env('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/** Cliente com a sessão do usuário nos cookies (usado por /api e pelas páginas). RLS se aplica. */
export async function createSessionClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(url(), anonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component: o proxy já renova os cookies.
        }
      },
    },
  });
}

/** Cliente autenticado por Bearer token (usado por /v1). RLS se aplica. */
export function createBearerClient(accessToken: string): SupabaseClient {
  return createClient(url(), anonKey(), {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Cliente anônimo, sem sessão (login por token). */
export function createAnonClient(): SupabaseClient {
  return createClient(url(), anonKey(), { auth: noSession });
}

/** Cliente com service role: ignora RLS. Usar apenas em código de admin, no servidor. */
export function createServiceClient(): SupabaseClient {
  return createClient(url(), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: noSession });
}

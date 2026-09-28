import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * - Renova a sessão (cookies) do Supabase em toda navegação e chamada a /api.
 * - Páginas exigem login; /login redireciona para a home se já autenticado.
 * - /v1 fica de fora (autentica por Bearer token) — ver matcher.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims;
  const { pathname } = request.nextUrl;

  // A API responde 401 por conta própria; aqui só renovamos os cookies.
  if (pathname.startsWith('/api')) return response;

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!isAuthenticated && pathname !== '/login') return redirectTo('/login');
  if (isAuthenticated && pathname === '/login') return redirectTo('/');
  return response;
}

export const config = {
  matcher: ['/((?!v1|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

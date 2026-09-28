'use client';

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

/** fetch para a API interna (/api). Lança ApiRequestError com a mensagem da API. */
export async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    // Sessão expirada: recarga completa limpa qualquer estado do cliente.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
    throw new ApiRequestError(401, 'Sessão expirada.');
  }
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const first = body?.error?.details?.[0]?.message;
    throw new ApiRequestError(
      res.status,
      first ?? body?.error?.message ?? 'Erro inesperado.',
      body?.error?.details,
    );
  }
  return body as T;
}

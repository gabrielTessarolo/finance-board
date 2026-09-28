import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const unauthorized = (message = 'Não autenticado.') => new ApiError(401, 'unauthorized', message);
export const forbidden = (message = 'Sem permissão para esta ação.') => new ApiError(403, 'forbidden', message);
export const notFound = (what = 'Recurso') => new ApiError(404, 'not_found', `${what} não encontrado(a).`);
export const conflict = (message: string) => new ApiError(409, 'conflict', message);
export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, 'bad_request', message, details);

interface PgError {
  code?: string;
  message: string;
}

/** Converte um erro do PostgREST/Postgres em ApiError. */
export function fromDb(error: PgError): ApiError {
  switch (error.code) {
    case '23505':
      return conflict('Já existe um registro com estes dados.');
    case '23503':
      return conflict('Operação bloqueada: o registro está em uso ou referencia um item inexistente.');
    case '42501':
      return forbidden();
    case '22P02':
    case '22007':
    case '22008':
      return badRequest('Valor em formato inválido.');
    default:
      console.error('[db]', error);
      return new ApiError(500, 'internal_error', 'Erro interno ao acessar o banco de dados.');
  }
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) } },
      { status: e.status },
    );
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'validation_error',
          message: 'Dados inválidos.',
          details: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
      { status: 400 },
    );
  }
  console.error('[api]', e);
  return NextResponse.json(
    { error: { code: 'internal_error', message: 'Erro interno do servidor.' } },
    { status: 500 },
  );
}

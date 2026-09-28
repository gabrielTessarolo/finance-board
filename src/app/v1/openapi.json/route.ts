import { buildOpenApi } from '@/lib/openapi';

export function GET() {
  return Response.json(buildOpenApi());
}

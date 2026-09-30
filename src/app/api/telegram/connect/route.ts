import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { withSession } from '@/lib/api/route';
import { createServiceClient } from '@/lib/supabase/clients';
import type { ApiContext } from '@/lib/api/route';

async function connect(_req: NextRequest, { supabase, user }: ApiContext): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.refresh_token) {
    return Response.json({ error: { message: 'Sessão inválida.' } }, { status: 401 });
  }

  const token = randomBytes(16).toString('hex');
  const db = createServiceClient();

  // Remove tokens anteriores do mesmo usuário antes de criar um novo
  await db.from('telegram_enrollment_tokens').delete().eq('user_id', user.id);

  const { error } = await db.from('telegram_enrollment_tokens').insert({
    token,
    user_id: user.id,
    refresh_token: session.refresh_token,
  });

  if (error) {
    console.error('[telegram/connect] erro:', error);
    return Response.json({ error: { message: 'Erro ao gerar código.' } }, { status: 500 });
  }

  return Response.json({ data: { token } });
}

export const POST = withSession(connect);

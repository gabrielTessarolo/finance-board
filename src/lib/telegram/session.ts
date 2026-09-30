import 'server-only';
import { createAnonClient, createServiceClient } from '@/lib/supabase/clients';

export interface ResolvedSession {
  sessionId: string;
  userId: string;
  accessToken: string;
}

export async function resolveSession(chatId: number): Promise<ResolvedSession | null> {
  const db = createServiceClient();
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('telegram_sessions')
    .select('id, user_id, refresh_token')
    .eq('telegram_chat_id', chatId)
    .is('revoked_at', null)
    .gt('created_at', threeMonthsAgo)
    .gt('last_access_at', twoWeeksAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const { data: auth, error: authError } = await createAnonClient().auth.refreshSession({
    refresh_token: data.refresh_token,
  });
  if (authError || !auth.session) return null;

  // Persiste novo refresh_token (Supabase faz rotação a cada uso) e atualiza last_access_at
  await db
    .from('telegram_sessions')
    .update({
      last_access_at: now.toISOString(),
      refresh_token: auth.session.refresh_token,
    })
    .eq('id', data.id);

  return { sessionId: data.id, userId: data.user_id, accessToken: auth.session.access_token };
}

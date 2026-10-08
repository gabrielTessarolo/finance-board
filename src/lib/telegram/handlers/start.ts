import 'server-only';
import { createServiceClient } from '@/lib/supabase/clients';

export async function handleStart(chatId: number, text: string): Promise<string> {
  const token = text.replace(/^\/start\s*/i, '').trim();

  if (!token) {
    return 'Para conectar sua conta, acesse o FinanceBoard em *Configurações > Conectar Telegram*.';
  }

  const db = createServiceClient();

  // Remove tokens expirados antes de validar
  await db.from('telegram_enrollment_tokens').delete().lt('expires_at', new Date().toISOString());

  const { data: enrollment } = await db
    .from('telegram_enrollment_tokens')
    .select('user_id, refresh_token, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!enrollment) {
    return 'Código inválido ou expirado. Gere um novo código no FinanceBoard.';
  }

  const { error } = await db.from('telegram_sessions').insert({
    telegram_chat_id: chatId,
    user_id: enrollment.user_id,
    refresh_token: enrollment.refresh_token,
  });

  await db.from('telegram_enrollment_tokens').delete().eq('token', token);

  if (error) {
    console.error('[telegram/start] erro ao criar sessão:', error);
    return 'Erro ao conectar. Tente novamente.';
  }

  return [
    '✅ *Conta conectada com sucesso!*',
    '',
    'Comandos disponíveis:',
    '/dashboard — resumo do mês atual',
    '/registrar \\[descrição\\] \\[valor\\] \\[categoria\\] — nova transação',
  ].join('\n');
}

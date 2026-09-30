import { sendMessage } from '@/lib/telegram/send';
import { resolveSession } from '@/lib/telegram/session';
import { handleStart } from '@/lib/telegram/handlers/start';
import { handleDashboard } from '@/lib/telegram/handlers/dashboard';
import { handleRegistrar } from '@/lib/telegram/handlers/registrar';

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
  };
}

const HELP = [
  'Comandos disponíveis:',
  '/dashboard — resumo do mês atual',
  '/registrar \\[descrição\\] \\[valor\\] \\[categoria\\] — nova transação',
].join('\n');

export async function POST(req: Request): Promise<Response> {
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response(null, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return new Response(null, { status: 200 });
  }

  const { message } = update;
  if (!message?.text || !message?.chat?.id) return new Response(null, { status: 200 });

  const chatId = message.chat.id;
  const text = message.text.trim();

  try {
    if (text.startsWith('/start')) {
      await sendMessage(chatId, await handleStart(chatId, text));
      return new Response(null, { status: 200 });
    }

    const session = await resolveSession(chatId);
    if (!session) {
      await sendMessage(
        chatId,
        'Sessão não encontrada ou expirada.\nAcesse o FinanceBoard em *Configurações > Conectar Telegram* para reconectar.',
      );
      return new Response(null, { status: 200 });
    }

    let reply: string;
    if (text.startsWith('/dashboard')) {
      reply = await handleDashboard(session.accessToken);
    } else if (text.startsWith('/registrar')) {
      reply = await handleRegistrar(text, session.accessToken, session.userId);
    } else {
      reply = HELP;
    }

    await sendMessage(chatId, reply);
  } catch (e) {
    console.error('[telegram/webhook] erro:', e);
    await sendMessage(chatId, 'Ocorreu um erro inesperado. Tente novamente.').catch(() => undefined);
  }

  return new Response(null, { status: 200 });
}

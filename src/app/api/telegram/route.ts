import { answerCallbackQuery, sendMessage } from '@/lib/telegram/send';
import { resolveSession } from '@/lib/telegram/session';
import { handleStart } from '@/lib/telegram/handlers/start';
import { handleDashboard } from '@/lib/telegram/handlers/dashboard';
import {
  handleCategoryCallback,
  handleRegistrarReply,
  showCategories,
} from '@/lib/telegram/handlers/registrar';

interface TelegramMessage {
  chat: { id: number };
  text?: string;
  reply_to_message?: { text?: string };
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: { id: number };
    message?: TelegramMessage;
    data?: string;
  };
}

const HELP = [
  'Comandos disponíveis:',
  '/dashboard — resumo do mês atual',
  '/registrar — nova transação',
].join('\n');

const SESSION_EXPIRED =
  'Sessão não encontrada ou expirada.\nAcesse o FinanceBoard em *Configurações > Conectar Telegram* para reconectar.';

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

  try {
    // ── Clique em botão inline ──────────────────────────────────────────────
    if (update.callback_query) {
      const { id: callbackId, from, message, data } = update.callback_query;
      const chatId = message?.chat?.id ?? from.id;

      const session = await resolveSession(chatId);
      if (!session) {
        await answerCallbackQuery(callbackId);
        await sendMessage(chatId, SESSION_EXPIRED);
        return new Response(null, { status: 200 });
      }

      await handleCategoryCallback(chatId, callbackId, data ?? '', session.accessToken);
      return new Response(null, { status: 200 });
    }

    // ── Mensagem de texto ───────────────────────────────────────────────────
    const { message } = update;
    if (!message?.text || !message?.chat?.id) return new Response(null, { status: 200 });

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text.startsWith('/start')) {
      await sendMessage(chatId, await handleStart(chatId, text));
      return new Response(null, { status: 200 });
    }

    const session = await resolveSession(chatId);
    if (!session) {
      await sendMessage(chatId, SESSION_EXPIRED);
      return new Response(null, { status: 200 });
    }

    // Resposta ao force_reply do /registrar (contém ref:UUID na mensagem original)
    if (message.reply_to_message?.text && /\bref:[a-f0-9-]{36}\b/.test(message.reply_to_message.text)) {
      const reply = await handleRegistrarReply(
        text,
        message.reply_to_message.text,
        session.accessToken,
        session.userId,
      );
      await sendMessage(chatId, reply);
      return new Response(null, { status: 200 });
    }

    let reply: string;
    if (text.startsWith('/dashboard')) {
      reply = await handleDashboard(session.accessToken);
    } else if (text.startsWith('/registrar')) {
      await showCategories(chatId, session.accessToken);
      return new Response(null, { status: 200 });
    } else {
      reply = HELP;
    }

    await sendMessage(chatId, reply);
  } catch (e) {
    console.error('[telegram/webhook] erro:', e);
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
    if (chatId) {
      await sendMessage(chatId, 'Ocorreu um erro inesperado. Tente novamente.').catch(() => undefined);
    }
  }

  return new Response(null, { status: 200 });
}

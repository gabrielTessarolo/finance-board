import 'server-only';

type InlineButton = { text: string; callback_data: string };

function botApi(method: string): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN não configurado.');
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(botApi('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export async function sendMessageWithKeyboard(
  chatId: number,
  text: string,
  keyboard: InlineButton[][],
): Promise<void> {
  await fetch(botApi('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard },
    }),
  });
}

export async function sendMessageWithForceReply(chatId: number, text: string): Promise<void> {
  await fetch(botApi('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: { force_reply: true, selective: true },
    }),
  });
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  await fetch(botApi('answerCallbackQuery'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

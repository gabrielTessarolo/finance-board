import 'server-only';
import { createBearerClient } from '@/lib/supabase/clients';
import { formatBRL, todayISO } from '@/lib/format';
import { answerCallbackQuery, sendMessageWithForceReply, sendMessageWithKeyboard } from '../send';
import { parseInput } from '../parse';
import type { ClassType } from '@/lib/types';

const SECTION_ORDER: ClassType[] = [
  'RECEITA',
  'DESPESA_ESSENCIAL',
  'DESPESA_NAO_ESSENCIAL',
  'OUTRAS_DESPESAS',
  'TRANSFERENCIA_INTERNA',
];

const SECTION_LABELS: Record<ClassType, string> = {
  RECEITA: '💰 Receitas',
  DESPESA_ESSENCIAL: '🏠 Despesas essenciais',
  DESPESA_NAO_ESSENCIAL: '🎮 Despesas não essenciais',
  OUTRAS_DESPESAS: '📦 Outras despesas',
  TRANSFERENCIA_INTERNA: '🔄 Transferências internas',
};

/** /registrar — exibe o teclado de categorias organizado por seção. */
export async function showCategories(chatId: number, accessToken: string): Promise<void> {
  const supabase = createBearerClient(accessToken);
  const { data: classes, error } = await supabase
    .from('items_classes')
    .select('id, name, type')
    .order('name');

  if (error || !classes?.length) {
    const { sendMessage } = await import('../send');
    await sendMessage(chatId, 'Não foi possível carregar as categorias. Tente novamente.');
    return;
  }

  const keyboard: { text: string; callback_data: string }[][] = [];

  for (const type of SECTION_ORDER) {
    const group = (classes as { id: string; name: string; type: ClassType }[]).filter(
      (c) => c.type === type,
    );
    if (!group.length) continue;

    // Linha de cabeçalho da seção (noop — apenas visual)
    keyboard.push([{ text: SECTION_LABELS[type], callback_data: 'noop' }]);

    // Botões de categoria, 2 por linha
    for (let i = 0; i < group.length; i += 2) {
      const row = [{ text: group[i].name, callback_data: `reg:${group[i].id}` }];
      if (group[i + 1]) row.push({ text: group[i + 1].name, callback_data: `reg:${group[i + 1].id}` });
      keyboard.push(row);
    }
  }

  await sendMessageWithKeyboard(chatId, 'Selecione a categoria:', keyboard);
}

/** Callback de botão — responde ao clique e envia force_reply com o ref da categoria. */
export async function handleCategoryCallback(
  chatId: number,
  callbackQueryId: string,
  callbackData: string,
  accessToken: string,
): Promise<void> {
  await answerCallbackQuery(callbackQueryId);

  if (callbackData === 'noop' || !callbackData.startsWith('reg:')) return;

  const classId = callbackData.slice(4); // remove "reg:"

  const supabase = createBearerClient(accessToken);
  const { data } = await supabase
    .from('items_classes')
    .select('name')
    .eq('id', classId)
    .maybeSingle();

  const name = (data as { name: string } | null)?.name ?? 'Categoria';

  await sendMessageWithForceReply(
    chatId,
    [
      `Categoria: *${name}*`,
      '',
      'Envie o valor e a descrição numa mensagem só.',
      'Exemplos: `48,50 Comprinha legal` · `R$100 Mercado` · `1.000,00 Viagem`',
      '',
      `ref:${classId}`,
    ].join('\n'),
  );
}

/** Recebe o texto em resposta ao force_reply, faz o parse e cria a transação. */
export async function handleRegistrarReply(
  replyText: string,
  replyToText: string,
  accessToken: string,
  userId: string,
): Promise<string> {
  const match = /\bref:([a-f0-9-]{36})\b/.exec(replyToText);
  if (!match) return 'Não consegui identificar a categoria. Use /registrar para recomeçar.';

  const classificationId = match[1];

  const parsed = parseInput(replyText);
  if (!parsed) {
    return [
      'Não consegui identificar o valor na mensagem.',
      '',
      'Tente: `48,50 Comprinha legal` ou `R$100 Mercado`',
    ].join('\n');
  }

  const supabase = createBearerClient(accessToken);

  const { data: cls } = await supabase
    .from('items_classes')
    .select('name')
    .eq('id', classificationId)
    .maybeSingle();

  if (!cls) return 'Categoria não encontrada. Use /registrar para recomeçar.';

  const { error } = await supabase.from('transaction_items').insert({
    description: parsed.description,
    classification_id: classificationId,
    value: parsed.value,
    transaction_date: todayISO(),
    custom_data: {},
    user_id: userId,
  });

  if (error) {
    console.error('[telegram/registrar] erro:', error);
    return 'Erro ao registrar a transação. Tente novamente.';
  }

  return `✅ *Transação registrada!*\n\n${parsed.description} — ${formatBRL(parsed.value)} (${(cls as { name: string }).name})`;
}

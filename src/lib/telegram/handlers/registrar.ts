import 'server-only';
import { createBearerClient } from '@/lib/supabase/clients';
import { formatBRL, todayISO } from '@/lib/format';

const HELP = [
  'Use o formato: `/registrar [descrição] [valor] [categoria]`',
  '',
  'Exemplo: `/registrar Mercado 45,50 Alimentação`',
].join('\n');

export async function handleRegistrar(
  text: string,
  accessToken: string,
  userId: string,
): Promise<string> {
  const args = text.replace(/^\/registrar\s*/i, '').trim();
  if (!args) return HELP;

  const parts = args.split(/\s+/);
  if (parts.length < 3) return HELP;

  const categoryName = parts[parts.length - 1];
  const rawValue = parts[parts.length - 2];
  const description = parts.slice(0, -2).join(' ');

  const value = parseFloat(rawValue.replace(',', '.'));
  if (isNaN(value) || value <= 0) {
    return `Valor inválido: "${rawValue}".\n\n${HELP}`;
  }

  const supabase = createBearerClient(accessToken);

  const { data: classes, error: classError } = await supabase
    .from('items_classes')
    .select('id, name')
    .order('name');

  if (classError || !classes) return 'Não foi possível carregar as categorias. Tente novamente.';

  const found = (classes as { id: string; name: string }[]).find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
  );

  if (!found) {
    const available = (classes as { name: string }[]).map((c) => c.name).join(', ');
    return `Categoria "${categoryName}" não encontrada.\n\nDisponíveis: ${available}`;
  }

  const rounded = Math.round(value * 100) / 100;

  const { error } = await supabase.from('transaction_items').insert({
    description,
    classification_id: found.id,
    value: rounded,
    transaction_date: todayISO(),
    custom_data: {},
    user_id: userId,
  });

  if (error) {
    console.error('[telegram/registrar] erro:', error);
    return 'Erro ao registrar a transação. Tente novamente.';
  }

  return `✅ *Transação registrada!*\n\n${description} — ${formatBRL(rounded)} (${found.name})`;
}

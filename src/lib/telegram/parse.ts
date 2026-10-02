/** Converte string de valor monetário para número (suporta formatos BR e EN). */
export function parseValue(raw: string): number | null {
  let s = raw.replace(/^R?\$?/i, '').trim();
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(',', '.');
  }
  const v = parseFloat(s);
  return isNaN(v) || v <= 0 ? null : Math.round(v * 100) / 100;
}

const VALUE_TOKEN_RE = /^R?\$?\d[,.\d]*$/i;

/**
 * Encontra o token de valor numa string livre e separa a descrição.
 * Aceita o valor em qualquer posição na frase.
 */
export function parseInput(text: string): { value: number; description: string } | null {
  const tokens = text.trim().split(/\s+/);
  const valueIndex = tokens.findIndex((t) => VALUE_TOKEN_RE.test(t));
  if (valueIndex === -1) return null;

  const value = parseValue(tokens[valueIndex]);
  if (!value) return null;

  const descTokens = [...tokens.slice(0, valueIndex), ...tokens.slice(valueIndex + 1)];
  return { value, description: descTokens.join(' ').trim() || 'Sem descrição' };
}

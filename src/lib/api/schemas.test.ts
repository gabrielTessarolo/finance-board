import { describe, expect, it } from 'vitest';
import {
  classCreateSchema,
  loginSchema,
  transactionCreateSchema,
  transactionListQuerySchema,
  transactionUpdateSchema,
} from './schemas';

// ─── loginSchema ───────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('válido', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: '123' })).not.toThrow();
  });
  it('e-mail inválido', () => {
    expect(() => loginSchema.parse({ email: 'nao-é-email', password: '123' })).toThrow();
  });
  it('senha ausente', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: '' })).toThrow();
  });
});

// ─── transactionCreateSchema ───────────────────────────────────────────────────

describe('transactionCreateSchema', () => {
  const base = {
    description: 'Mercado',
    classificationId: '550e8400-e29b-41d4-a716-446655440000',
    value: 48.5,
  };

  it('válido mínimo', () => {
    expect(() => transactionCreateSchema.parse(base)).not.toThrow();
  });

  it('válido com data e customData', () => {
    expect(() =>
      transactionCreateSchema.parse({ ...base, transactionDate: '2026-01-15', customData: {} }),
    ).not.toThrow();
  });

  it('descrição vazia', () => {
    expect(() => transactionCreateSchema.parse({ ...base, description: '' })).toThrow();
  });

  it('descrição só espaços (trim)', () => {
    expect(() => transactionCreateSchema.parse({ ...base, description: '   ' })).toThrow();
  });

  it('descrição muito longa (>255)', () => {
    expect(() =>
      transactionCreateSchema.parse({ ...base, description: 'a'.repeat(256) }),
    ).toThrow();
  });

  it('valor zero', () => {
    expect(() => transactionCreateSchema.parse({ ...base, value: 0 })).toThrow();
  });

  it('valor negativo', () => {
    expect(() => transactionCreateSchema.parse({ ...base, value: -1 })).toThrow();
  });

  it('valor com mais de 2 casas decimais', () => {
    expect(() => transactionCreateSchema.parse({ ...base, value: 48.123 })).toThrow();
  });

  it('classificationId inválido (não é UUID)', () => {
    expect(() =>
      transactionCreateSchema.parse({ ...base, classificationId: 'nao-uuid' }),
    ).toThrow();
  });

  it('data em formato inválido', () => {
    expect(() =>
      transactionCreateSchema.parse({ ...base, transactionDate: '15/01/2026' }),
    ).toThrow();
  });
});

// ─── transactionUpdateSchema ───────────────────────────────────────────────────

describe('transactionUpdateSchema', () => {
  it('atualização parcial válida', () => {
    expect(() => transactionUpdateSchema.parse({ value: 100 })).not.toThrow();
  });

  it('objeto vazio lança erro', () => {
    expect(() => transactionUpdateSchema.parse({})).toThrow();
  });

  it('valor inválido em atualização parcial', () => {
    expect(() => transactionUpdateSchema.parse({ value: -5 })).toThrow();
  });
});

// ─── transactionListQuerySchema ────────────────────────────────────────────────

describe('transactionListQuerySchema', () => {
  it('sem parâmetros é válido', () => {
    expect(() => transactionListQuerySchema.parse({})).not.toThrow();
  });

  it('month válido', () => {
    expect(() => transactionListQuerySchema.parse({ month: '2026-01' })).not.toThrow();
  });

  it('month inválido', () => {
    expect(() => transactionListQuerySchema.parse({ month: '2026-13' })).toThrow();
  });

  it('limit e offset como strings (coerce)', () => {
    const result = transactionListQuerySchema.parse({ limit: '50', offset: '10' });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(10);
  });

  it('limit zero lança erro', () => {
    expect(() => transactionListQuerySchema.parse({ limit: '0' })).toThrow();
  });

  it('limit acima de 1000 lança erro', () => {
    expect(() => transactionListQuerySchema.parse({ limit: '1001' })).toThrow();
  });
});

// ─── classCreateSchema ─────────────────────────────────────────────────────────

describe('classCreateSchema', () => {
  it('válido', () => {
    expect(() =>
      classCreateSchema.parse({ name: 'Alimentação', type: 'DESPESA_ESSENCIAL' }),
    ).not.toThrow();
  });

  it('tipo inválido', () => {
    expect(() =>
      classCreateSchema.parse({ name: 'Alimentação', type: 'INVALIDO' }),
    ).toThrow();
  });

  it('nome vazio', () => {
    expect(() => classCreateSchema.parse({ name: '', type: 'DESPESA_ESSENCIAL' })).toThrow();
  });

  it('isReceipt default false', () => {
    const result = classCreateSchema.parse({ name: 'Salário', type: 'RECEITA' });
    expect(result.isReceipt).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { parseInput, parseValue } from './parse';

// ─── parseValue ────────────────────────────────────────────────────────────────

describe('parseValue', () => {
  describe('inteiros', () => {
    it('número inteiro simples', () => expect(parseValue('100')).toBe(100));
    it('número grande sem separador', () => expect(parseValue('1000')).toBe(1000));
  });

  describe('formato brasileiro (vírgula decimal)', () => {
    it('1 casa decimal', () => expect(parseValue('48,5')).toBe(48.5));
    it('2 casas decimais', () => expect(parseValue('48,50')).toBe(48.5));
    it('valor redondo com vírgula', () => expect(parseValue('100,00')).toBe(100));
  });

  describe('formato internacional (ponto decimal)', () => {
    it('1 casa decimal', () => expect(parseValue('48.5')).toBe(48.5));
    it('2 casas decimais', () => expect(parseValue('48.50')).toBe(48.5));
  });

  describe('formato brasileiro completo (ponto milhar + vírgula decimal)', () => {
    it('1.000,00', () => expect(parseValue('1.000,00')).toBe(1000));
    it('1.500,50', () => expect(parseValue('1.500,50')).toBe(1500.5));
    it('10.000,00', () => expect(parseValue('10.000,00')).toBe(10000));
  });

  describe('prefixo R$', () => {
    it('R$48', () => expect(parseValue('R$48')).toBe(48));
    it('R$48,50', () => expect(parseValue('R$48,50')).toBe(48.5));
    it('R$1.000,00', () => expect(parseValue('R$1.000,00')).toBe(1000));
    it('r$48 (minúsculo)', () => expect(parseValue('r$48')).toBe(48));
  });

  describe('arredondamento', () => {
    it('arredonda para 2 casas decimais', () => expect(parseValue('48,999')).toBe(49));
  });

  describe('inválidos', () => {
    it('string vazia', () => expect(parseValue('')).toBeNull());
    it('texto sem número', () => expect(parseValue('abc')).toBeNull());
    it('zero', () => expect(parseValue('0')).toBeNull());
    it('negativo', () => expect(parseValue('-10')).toBeNull());
    it('só R$', () => expect(parseValue('R$')).toBeNull());
  });
});

// ─── parseInput ────────────────────────────────────────────────────────────────

describe('parseInput', () => {
  describe('valor no final (padrão)', () => {
    it('descrição + valor', () => {
      expect(parseInput('Mercado 48,50')).toEqual({ value: 48.5, description: 'Mercado' });
    });
    it('descrição com espaços + valor', () => {
      expect(parseInput('Comprinha legal 48,50')).toEqual({
        value: 48.5,
        description: 'Comprinha legal',
      });
    });
  });

  describe('valor no início', () => {
    it('valor + descrição', () => {
      expect(parseInput('48,50 Mercado')).toEqual({ value: 48.5, description: 'Mercado' });
    });
    it('valor + descrição com espaços', () => {
      expect(parseInput('100 Almoço executivo')).toEqual({
        value: 100,
        description: 'Almoço executivo',
      });
    });
  });

  describe('valor no meio', () => {
    it('antes + valor + depois', () => {
      expect(parseInput('Jantar 80,00 restaurante')).toEqual({
        value: 80,
        description: 'Jantar restaurante',
      });
    });
  });

  describe('formatos de valor variados', () => {
    it('inteiro', () => {
      expect(parseInput('Uber 30')).toEqual({ value: 30, description: 'Uber' });
    });
    it('ponto decimal', () => {
      expect(parseInput('Netflix 45.90')).toEqual({ value: 45.9, description: 'Netflix' });
    });
    it('R$ junto', () => {
      expect(parseInput('Farmácia R$23,50')).toEqual({ value: 23.5, description: 'Farmácia' });
    });
    it('formato completo R$1.000,00', () => {
      expect(parseInput('Viagem R$1.000,00')).toEqual({ value: 1000, description: 'Viagem' });
    });
  });

  describe('descrição ausente', () => {
    it('só valor retorna "Sem descrição"', () => {
      expect(parseInput('48,50')).toEqual({ value: 48.5, description: 'Sem descrição' });
    });
  });

  describe('inválidos', () => {
    it('string vazia', () => expect(parseInput('')).toBeNull());
    it('sem nenhum token numérico', () => expect(parseInput('Mercado alimentação')).toBeNull());
    it('valor zero', () => expect(parseInput('Mercado 0')).toBeNull());
    it('valor negativo', () => expect(parseInput('Mercado -10')).toBeNull());
  });
});

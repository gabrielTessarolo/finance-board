import { z } from 'zod';
import { CLASS_TYPES } from '@/lib/types';

// Mensagens de validação padrão em português
z.config(z.locales.pt());

const decimals2 = (v: number) => Math.round(v * 100) / 100 === v;

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o formato YYYY-MM.');

// ---------- auth ----------
export const loginSchema = z.object({
  email: z.email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ---------- classes ----------
const className = z.string().trim().min(1, 'Informe o nome.').max(120);

export const classCreateSchema = z.object({
  name: className,
  type: z.enum(CLASS_TYPES),
  isReceipt: z.boolean().default(false),
});

export const classUpdateSchema = z
  .object({
    name: className,
    type: z.enum(CLASS_TYPES),
    isReceipt: z.boolean(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Informe ao menos um campo.');

export const classListQuerySchema = z.object({
  type: z.enum(CLASS_TYPES).optional(),
});

// ---------- transações ----------
const value = z
  .number()
  .positive('O valor deve ser maior que zero.')
  .max(999_999_999_999.99)
  .refine(decimals2, 'Use no máximo 2 casas decimais.');

const customData = z.record(z.string(), z.unknown());

export const transactionCreateSchema = z.object({
  description: z.string().trim().min(1, 'Informe a descrição.').max(255),
  classificationId: z.uuid(),
  value,
  transactionDate: z.iso.date().optional(),
  customData: customData.optional(),
});

export const transactionUpdateSchema = z
  .object({
    description: z.string().trim().min(1).max(255),
    classificationId: z.uuid(),
    value,
    transactionDate: z.iso.date(),
    customData,
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Informe ao menos um campo.');

const optionalParam = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

export const transactionListQuerySchema = z.object({
  month: optionalParam(monthSchema),
  from: optionalParam(z.iso.date()),
  to: optionalParam(z.iso.date()),
  classificationId: optionalParam(z.uuid()),
  limit: optionalParam(z.coerce.number().int().min(1).max(1000)),
  offset: optionalParam(z.coerce.number().int().min(0)),
});

export const summaryQuerySchema = z.object({
  month: optionalParam(monthSchema),
  from: optionalParam(z.iso.date()),
  to: optionalParam(z.iso.date()),
});

// ---------- usuários (admin) ----------
const userName = z.string().trim().min(1, 'Informe o nome.').max(120);
const password = z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').max(72);

export const userCreateSchema = z.object({
  name: userName,
  email: z.email('E-mail inválido.'),
  password,
});

export const userUpdateSchema = z
  .object({
    name: userName,
    email: z.email('E-mail inválido.'),
    password,
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Informe ao menos um campo.');

// Tipos compartilhados entre API (servidor) e front (cliente). JSON sempre em camelCase.

export const CLASS_TYPES = [
  'RECEITA',
  'DESPESA_ESSENCIAL',
  'DESPESA_NAO_ESSENCIAL',
  'OUTRAS_DESPESAS',
  'TRANSFERENCIA_INTERNA',
] as const;

export type ClassType = (typeof CLASS_TYPES)[number];

export type Role = 'admin' | 'user';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface ItemClassDto {
  id: string;
  name: string;
  type: ClassType;
  isReceipt: boolean;
  isDefault: boolean;
  userId: string | null;
  createdAt: string;
}

export interface ClassificationRefDto {
  id: string;
  name: string;
  type: ClassType;
  isReceipt: boolean;
}

export interface TransactionDto {
  id: string;
  description: string;
  classificationId: string;
  classification: ClassificationRefDto | null;
  value: number;
  transactionDate: string; // YYYY-MM-DD
  createdAt: string;
  customData: Record<string, unknown>;
  userId: string;
}

export interface SummaryClassDto {
  classificationId: string;
  name: string;
  type: ClassType;
  isReceipt: boolean;
  total: number;
  count: number;
}

export interface SummaryDto {
  from: string;
  to: string;
  receipts: number;
  expenses: number;
  balance: number;
  transfers: number;
  byClass: SummaryClassDto[];
}

export interface ListMeta {
  total: number;
  limit: number;
  offset: number;
}

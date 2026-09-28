import type {
  ClassificationRefDto,
  ClassType,
  ItemClassDto,
  Role,
  TransactionDto,
  UserDto,
} from '@/lib/types';

// Linhas como vêm do banco (snake_case)
export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface ClassRow {
  id: string;
  name: string;
  type: ClassType;
  is_receipt: boolean;
  is_default: boolean;
  user_id: string | null;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  description: string;
  classification_id: string;
  value: number;
  transaction_date: string;
  created_at: string;
  custom_data: Record<string, unknown>;
  user_id: string;
  classification?: { id: string; name: string; type: ClassType; is_receipt: boolean } | null;
}

export const USER_COLUMNS = 'id, name, email, role, created_at';
export const CLASS_COLUMNS = 'id, name, type, is_receipt, is_default, user_id, created_at';
export const TRANSACTION_SELECT =
  'id, description, classification_id, value, transaction_date, created_at, custom_data, user_id, classification:items_classes(id, name, type, is_receipt)';

export const toUserDto = (r: UserRow): UserDto => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  createdAt: r.created_at,
});

export const toClassDto = (r: ClassRow): ItemClassDto => ({
  id: r.id,
  name: r.name,
  type: r.type,
  isReceipt: r.is_receipt,
  isDefault: r.is_default,
  userId: r.user_id,
  createdAt: r.created_at,
});

const toClassRef = (c: NonNullable<TransactionRow['classification']>): ClassificationRefDto => ({
  id: c.id,
  name: c.name,
  type: c.type,
  isReceipt: c.is_receipt,
});

export const toTransactionDto = (r: TransactionRow): TransactionDto => ({
  id: r.id,
  description: r.description,
  classificationId: r.classification_id,
  classification: r.classification ? toClassRef(r.classification) : null,
  value: Number(r.value),
  transactionDate: r.transaction_date,
  createdAt: r.created_at,
  customData: r.custom_data ?? {},
  userId: r.user_id,
});

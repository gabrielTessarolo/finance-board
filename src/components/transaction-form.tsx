'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { CLASS_TYPE_LABELS, todayISO } from '@/lib/format';
import { CLASS_TYPES, type ItemClassDto, type TransactionDto } from '@/lib/types';
import { btnPrimary, btnSecondary, ErrorBox, Field, inputCls, Modal } from './ui';

interface Props {
  classes: ItemClassDto[];
  transaction?: TransactionDto;
  defaultDate: string;
  onSaved: () => void;
  onClose: () => void;
}

export function TransactionForm({ classes, transaction, defaultDate, onSaved, onClose }: Props) {
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [classificationId, setClassificationId] = useState(transaction?.classificationId ?? '');
  const [value, setValue] = useState(transaction ? String(transaction.value) : '');
  const [date, setDate] = useState(transaction?.transactionDate ?? defaultDate);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const numeric = Number(value.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    setSaving(true);
    try {
      const payload = { description, classificationId, value: numeric, transactionDate: date || todayISO() };
      if (transaction) await api(`/transactions/${transaction.id}`, { method: 'PATCH', json: payload });
      else await api('/transactions', { method: 'POST', json: payload });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
      setSaving(false);
    }
  }

  return (
    <Modal title={transaction ? 'Editar transação' : 'Nova transação'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorBox message={error} />
        <Field label="Descrição">
          <input
            required
            autoFocus
            maxLength={255}
            className={inputCls}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Classificação">
          <select required className={inputCls} value={classificationId} onChange={(e) => setClassificationId(e.target.value)}>
            <option value="" disabled>
              Selecione…
            </option>
            {CLASS_TYPES.map((type) => {
              const group = classes.filter((c) => c.type === type);
              if (group.length === 0) return null;
              return (
                <optgroup key={type} label={CLASS_TYPE_LABELS[type]}>
                  {group.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor (R$)">
            <input
              required
              inputMode="decimal"
              placeholder="0,00"
              className={inputCls}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Field label="Data">
            <input required type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

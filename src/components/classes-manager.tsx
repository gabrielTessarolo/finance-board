'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { CLASS_TYPE_LABELS } from '@/lib/format';
import { CLASS_TYPES, type ClassType, type ItemClassDto } from '@/lib/types';
import { btnLink, btnLinkDanger, btnPrimary, btnSecondary, ErrorBox, Field, inputCls, Modal, PageHeader } from './ui';

type FormState = { item?: ItemClassDto } | null;

function ClassForm({ item, onSaved, onClose }: { item?: ItemClassDto; onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [type, setType] = useState<ClassType>(item?.type ?? 'DESPESA_ESSENCIAL');
  const [isReceipt, setIsReceipt] = useState(item?.isReceipt ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function changeType(next: ClassType) {
    setType(next);
    setIsReceipt(next === 'RECEITA'); // sugestão; o usuário pode ajustar
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const json = { name, type, isReceipt };
      if (item) await api(`/classes/${item.id}`, { method: 'PATCH', json });
      else await api('/classes', { method: 'POST', json });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
      setSaving(false);
    }
  }

  return (
    <Modal title={item ? 'Editar classe' : 'Nova classe'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorBox message={error} />
        <Field label="Nome">
          <input required autoFocus maxLength={120} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Tipo">
          <select className={inputCls} value={type} onChange={(e) => changeType(e.target.value as ClassType)}>
            {CLASS_TYPES.map((t) => (
              <option key={t} value={t}>
                {CLASS_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isReceipt} onChange={(e) => setIsReceipt(e.target.checked)} />
          Conta como receita (soma no saldo)
        </label>
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

export function ClassesManager() {
  const [classes, setClasses] = useState<ItemClassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    api<{ data: ItemClassDto[] }>('/classes')
      .then((r) => {
        if (cancelled) return;
        setClasses(r.data);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function remove(c: ItemClassDto) {
    if (!window.confirm(`Excluir a classe "${c.name}"?`)) return;
    try {
      await api(`/classes/${c.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir.');
    }
  }

  return (
    <>
      <PageHeader
        title="Classes"
        action={
          <button className={btnPrimary} onClick={() => setForm({})}>
            + Nova classe
          </button>
        }
      />
      <ErrorBox message={error} />
      {loading && <p className="text-slate-500">Carregando…</p>}

      <div className="mt-4 space-y-6">
        {CLASS_TYPES.map((type) => {
          const group = classes.filter((c) => c.type === type);
          if (group.length === 0) return null;
          return (
            <section key={type}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{CLASS_TYPE_LABELS[type]}</h2>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
                {group.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{c.name}</span>
                      {c.isDefault && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Padrão</span>
                      )}
                      {c.isReceipt && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Receita</span>
                      )}
                    </div>
                    {!c.isDefault && (
                      <div className="whitespace-nowrap">
                        <button className={btnLink} onClick={() => setForm({ item: c })}>
                          Editar
                        </button>
                        <span className="mx-2 text-slate-300">|</span>
                        <button className={btnLinkDanger} onClick={() => remove(c)}>
                          Excluir
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {form && (
        <ClassForm
          item={form.item}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}
    </>
  );
}

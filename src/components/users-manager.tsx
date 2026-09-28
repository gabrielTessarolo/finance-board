'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import type { UserDto } from '@/lib/types';
import { btnLink, btnLinkDanger, btnPrimary, btnSecondary, ErrorBox, Field, inputCls, Modal, PageHeader } from './ui';

type FormState = { user?: UserDto } | null;

function UserForm({ user, onSaved, onClose }: { user?: UserDto; onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (user) {
        const json: Record<string, string> = { name, email };
        if (password) json.password = password;
        await api(`/users/${user.id}`, { method: 'PATCH', json });
      } else {
        await api('/users', { method: 'POST', json: { name, email, password } });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
      setSaving(false);
    }
  }

  return (
    <Modal title={user ? 'Editar usuário' : 'Novo usuário'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorBox message={error} />
        <Field label="Nome">
          <input required autoFocus maxLength={120} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="E-mail">
          <input required type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={user ? 'Nova senha' : 'Senha'} hint={user ? 'Deixe em branco para manter a atual.' : 'Mínimo de 8 caracteres.'}>
          <input
            type="password"
            required={!user}
            minLength={user && !password ? undefined : 8}
            autoComplete="new-password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
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

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    api<{ data: UserDto[] }>('/users')
      .then((r) => {
        if (cancelled) return;
        setUsers(r.data);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function remove(u: UserDto) {
    if (!window.confirm(`Excluir ${u.name}? Todas as transações e classes dessa pessoa também serão apagadas.`)) return;
    try {
      await api(`/users/${u.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir.');
    }
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        action={
          <button className={btnPrimary} onClick={() => setForm({})}>
            + Novo usuário
          </button>
        }
      />
      <ErrorBox message={error} />
      {loading && <p className="text-slate-500">Carregando…</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.role === 'admin' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {u.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button className={btnLink} onClick={() => setForm({ user: u })}>
                    Editar
                  </button>
                  {u.role !== 'admin' && u.id !== currentUserId && (
                    <>
                      <span className="mx-2 text-slate-300">|</span>
                      <button className={btnLinkDanger} onClick={() => remove(u)}>
                        Excluir
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <UserForm
          user={form.user}
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

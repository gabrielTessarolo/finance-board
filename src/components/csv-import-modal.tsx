'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client/api';
import type { ItemClassDto } from '@/lib/types';
import { btnPrimary, btnSecondary, ErrorBox } from './ui';

interface ParsedRow {
  description: string;
  transactionDate: string | null; // YYYY-MM-DD
  valueStr: string;               // editable string; parsed at import time
  classificationId: string;
  importStatus: 'ok' | 'error' | null;
}

function normalizeStr(s: string) {
  return s.normalize('NFC').toLowerCase().trim();
}

function parseDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return isNaN(new Date(iso).getTime()) ? null : iso;
}

function toValueStr(raw: string): string {
  const cleaned = raw.replace(/R\$\s*/g, '').trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? String(Math.round(n * 100) / 100) : '';
}

function parseValue(valueStr: string): number | null {
  const n = parseFloat(valueStr.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function isRowValid(row: ParsedRow): boolean {
  return row.transactionDate !== null && parseValue(row.valueStr) !== null && row.classificationId !== '';
}

function splitCSVLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if ((ch === ',' || ch === ';' || ch === '\t') && !inQuotes) {
      cols.push(current); current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}

function parseCSV(text: string, classes: ItemClassDto[]): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length < 4) continue;
    const [rawDate, description, rawCategory, rawValue] = cols.map(c => c.trim());
    const matched = classes.find(c => normalizeStr(c.name) === normalizeStr(rawCategory ?? ''));
    rows.push({
      description: description ?? '',
      transactionDate: parseDate(rawDate ?? ''),
      valueStr: toValueStr(rawValue ?? ''),
      classificationId: matched?.id ?? '',
      importStatus: null,
    });
  }
  return rows;
}

type Phase = 'upload' | 'preview' | 'importing' | 'done';

interface Props {
  classes: ItemClassDto[];
  onClose: () => void;
  onImported: () => void;
}

export function CsvImportModal({ classes, onClose, onImported }: Props) {
  const [phase, setPhase] = useState<Phase>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [encoding, setEncoding] = useState<'utf-8' | 'windows-1252'>('utf-8');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'importing') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  function handleFile(file: File) {
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text, classes);
      if (parsed.length === 0) {
        setParseError('Nenhuma linha válida encontrada. Verifique o formato: Data, Descrição, Categoria, Valor.');
        return;
      }
      setRows(parsed);
      setPhase('preview');
    };
    reader.onerror = () => setParseError('Erro ao ler o arquivo.');
    reader.readAsText(file, encoding);
  }

  function updateRow(index: number, patch: Partial<ParsedRow>) {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function runImport() {
    type Entry = [rowIndex: number, row: ParsedRow, value: number];
    const toImport: Entry[] = [];
    rows.forEach((r, i) => {
      const value = parseValue(r.valueStr);
      if (isRowValid(r) && value !== null) toImport.push([i, r, value]);
    });

    setProgress({ done: 0, total: toImport.length });
    setPhase('importing');

    const statusMap: Record<number, 'ok' | 'error'> = {};
    for (let i = 0; i < toImport.length; i += 10) {
      const batch = toImport.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(([, r, value]) =>
          api('/transactions', {
            method: 'POST',
            json: {
              description: r.description,
              classificationId: r.classificationId,
              value,
              transactionDate: r.transactionDate!,
            },
          })
        )
      );
      results.forEach((result, j) => {
        statusMap[batch[j][0]] = result.status === 'fulfilled' ? 'ok' : 'error';
      });
      setProgress(p => ({ ...p, done: p.done + batch.length }));
    }

    setRows(prev =>
      prev.map((r, i) => (statusMap[i] !== undefined ? { ...r, importStatus: statusMap[i] } : r))
    );
    setPhase('done');
  }

  const validCount = rows.filter(isRowValid).length;
  const importedCount = rows.filter(r => r.importStatus === 'ok').length;
  const failedCount = rows.filter(r => r.importStatus === 'error').length;
  const canClose = phase !== 'importing';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && canClose && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Importar transações via CSV"
        className="flex w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Importar transações via CSV</h2>
          <button
            className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
            onClick={onClose}
            disabled={!canClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto p-6">
          {phase === 'upload' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-sm text-slate-500">
                Colunas obrigatórias: <strong>Data</strong> (DD/MM/AAAA), <strong>Descrição</strong>,{' '}
                <strong>Categoria</strong> e <strong>Valor</strong>, separadas por tabulação ou{' '}
                <code className="rounded bg-slate-100 px-1">;</code>.
              </p>
              <div className="flex gap-4 text-sm text-slate-600">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="encoding"
                    value="utf-8"
                    checked={encoding === 'utf-8'}
                    onChange={() => setEncoding('utf-8')}
                  />
                  UTF-8 <span className="text-slate-400">(Google Sheets, padrão)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="encoding"
                    value="windows-1252"
                    checked={encoding === 'windows-1252'}
                    onChange={() => setEncoding('windows-1252')}
                  />
                  Windows-1252 <span className="text-slate-400">(extratos bancários)</span>
                </label>
              </div>
              <ErrorBox message={parseError} />
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <button className={btnPrimary} onClick={() => fileRef.current?.click()}>
                Selecionar arquivo
              </button>
            </div>
          )}

          {phase !== 'upload' && (
            <>
              <p className="mb-3 text-sm">
                {phase === 'preview' && (
                  <>
                    <span className="font-medium text-emerald-700">
                      {validCount} {validCount === 1 ? 'linha válida' : 'linhas válidas'}
                    </span>
                    {rows.length - validCount > 0 && (
                      <span className="ml-2 text-amber-600">
                        · {rows.length - validCount} com problemas — revise antes de importar
                      </span>
                    )}
                  </>
                )}
                {phase === 'importing' && (
                  <span className="text-slate-500">
                    Importando… {progress.done} de {progress.total}
                  </span>
                )}
                {phase === 'done' && (
                  <>
                    <span className="font-medium text-emerald-700">
                      {importedCount} {importedCount === 1 ? 'transação importada' : 'transações importadas'}.
                    </span>
                    {failedCount > 0 && (
                      <span className="ml-2 text-red-600">{failedCount} com erro.</span>
                    )}
                  </>
                )}
              </p>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Data</th>
                      <th className="px-3 py-2 font-medium">Descrição</th>
                      <th className="px-3 py-2 font-medium">Categoria</th>
                      <th className="px-3 py-2 font-medium">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, i) => {
                      const value = parseValue(row.valueStr);
                      const valid = row.transactionDate !== null && value !== null && row.classificationId !== '';
                      const disabled = phase !== 'preview';

                      let badge: React.ReactNode;
                      if (row.importStatus === 'ok') {
                        badge = (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Importado
                          </span>
                        );
                      } else if (row.importStatus === 'error') {
                        badge = (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Erro
                          </span>
                        );
                      } else if (valid) {
                        badge = (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Válido
                          </span>
                        );
                      } else {
                        const issues: string[] = [];
                        if (!row.transactionDate) issues.push('data');
                        if (value === null) issues.push('valor');
                        if (!row.classificationId) issues.push('categoria');
                        badge = (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {issues.join(', ')}
                          </span>
                        );
                      }

                      return (
                        <tr key={i} className={!valid && !row.importStatus ? 'bg-amber-50/40' : ''}>
                          <td className="whitespace-nowrap px-3 py-2">{badge}</td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              disabled={disabled}
                              value={row.transactionDate ?? ''}
                              className="w-36 rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
                              onChange={e => updateRow(i, { transactionDate: e.target.value || null })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              disabled={disabled}
                              value={row.description}
                              maxLength={255}
                              className="w-44 rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
                              onChange={e => updateRow(i, { description: e.target.value })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              disabled={disabled}
                              value={row.classificationId}
                              className="w-44 rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
                              onChange={e => updateRow(i, { classificationId: e.target.value })}
                            >
                              <option value="">Selecione…</option>
                              {classes.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              disabled={disabled}
                              inputMode="decimal"
                              placeholder="0.00"
                              value={row.valueStr}
                              className="w-28 rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
                              onChange={e => updateRow(i, { valueStr: e.target.value })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          {phase === 'done' ? (
            <button
              className={btnPrimary}
              onClick={() => {
                if (importedCount > 0) onImported();
                onClose();
              }}
            >
              Fechar
            </button>
          ) : (
            <>
              <button className={btnSecondary} disabled={!canClose} onClick={onClose}>
                Cancelar
              </button>
              {phase === 'preview' && (
                <button className={btnPrimary} disabled={validCount === 0} onClick={runImport}>
                  Importar {validCount} {validCount === 1 ? 'transação' : 'transações'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

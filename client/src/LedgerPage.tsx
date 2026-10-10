import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from './api/client';
import type { JournalEntry } from './api/types';
import { formatDateTime, formatMoney } from './Format';

const SOURCE_BADGE: Record<JournalEntry['sourceType'], string> = {
  PAYROLL: 'badge-cyan',
  BILL_PAY: 'badge-emerald',
  PAYOUT: 'badge-cyan',
  FX_CONVERSION: 'badge-amber',
  REVERSAL: 'badge-amber',
};

const DEBIT_COLOR = '#38bdf8';
const CREDIT_COLOR = '#34d399';

function entryTotal(entry: JournalEntry): number {
  return entry.lines.filter((l) => l.direction === 'DEBIT').reduce((s, l) => s + l.amountMinor, 0);
}

function isBalanced(entry: JournalEntry): boolean {
  const debits = entry.lines.filter((l) => l.direction === 'DEBIT').reduce((s, l) => s + l.amountMinor, 0);
  const credits = entry.lines.filter((l) => l.direction === 'CREDIT').reduce((s, l) => s + l.amountMinor, 0);
  return debits === credits;
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setEntries(await api.listJournalEntries());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the ledger');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh every 3 seconds so a payment confirmed by a webhook shows up without a page reload.
  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <section className="glass-panel" style={{ padding: '24px', marginBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Journal entries</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Updates automatically</span>
      </div>

      {error && <p style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: '12px' }}>{error}</p>}
      {loading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}
      {!loading && entries.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Nothing in the ledger yet. Pay a bill or approve a payroll run and the entry appears here.
        </p>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          {entries.length > 0 && (
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 0' }}>Entry</th>
                <th>Description</th>
                <th>Type</th>
                <th>Time</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
          )}
          <tbody>
            {entries.map((entry) => {
              const expanded = open.has(entry.id);
              return (
                <Fragment key={entry.id}>
                  <tr
                    onClick={() => toggle(entry.id)}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    aria-expanded={expanded}
                  >
                    <td className="mono-figure" style={{ padding: '12px 0', color: '#38bdf8' }}>
                      {expanded ? '▾' : '▸'} {entry.id}
                    </td>
                    <td>{entry.description}</td>
                    <td><span className={`badge ${SOURCE_BADGE[entry.sourceType]}`}>{entry.sourceType}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDateTime(entry.createdAt)}</td>
                    <td className="mono-figure" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(entryTotal(entry), entry.lines[0]?.currency ?? 'NGN')}
                    </td>
                  </tr>
                  {expanded && (
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td colSpan={5} style={{ padding: '8px 0 16px 24px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                              <th style={{ padding: '6px 0' }}>Account</th>
                              <th style={{ textAlign: 'right' }}>Debit</th>
                              <th style={{ textAlign: 'right' }}>Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.lines.map((line) => (
                              <tr key={line.id}>
                                <td className="mono-figure" style={{ padding: '6px 0' }}>{line.accountCode}</td>
                                <td className="mono-figure" style={{ textAlign: 'right', color: DEBIT_COLOR }}>
                                  {line.direction === 'DEBIT' ? formatMoney(line.amountMinor, line.currency) : ''}
                                </td>
                                <td className="mono-figure" style={{ textAlign: 'right', color: CREDIT_COLOR }}>
                                  {line.direction === 'CREDIT' ? formatMoney(line.amountMinor, line.currency) : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ marginTop: '8px' }}>
                          <span className={`badge ${isBalanced(entry) ? 'badge-emerald' : 'badge-amber'}`}>
                            {isBalanced(entry) ? 'Debits = credits' : 'Unbalanced'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

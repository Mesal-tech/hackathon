import { useCallback, useEffect, useState } from 'react';
import { api } from './api/client';
import type { Employee, PayrollRun } from './api/types';
import { formatMoney, nairaToMinor } from './Format';

const STATUS_BADGE: Record<PayrollRun['status'], string> = {
  DRAFT: 'badge-cyan',
  PENDING_APPROVAL: 'badge-amber',
  APPROVED: 'badge-cyan',
  DISPATCHING: 'badge-cyan',
  COMPLETED: 'badge-emerald',
  FAILED: 'badge-amber',
};

const STATUS_LABEL: Record<PayrollRun['status'], string> = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'AWAITING APPROVAL',
  APPROVED: 'APPROVED',
  DISPATCHING: 'PAYING OUT',
  COMPLETED: 'PAID',
  FAILED: 'FAILED',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  padding: '10px 12px',
  color: 'inherit',
  fontSize: '0.9rem',
  minWidth: 0,
};

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // id of the run being approved, or 'create'

  // New employee form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bankCode, setBankCode] = useState('058');
  const [accountNumber, setAccountNumber] = useState('');
  const [salary, setSalary] = useState('');

  // New run form
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // "2026-10"

  const load = useCallback(async () => {
    try {
      const [emps, rs] = await Promise.all([api.listEmployees(), api.listPayrollRuns()]);
      setEmployees(emps);
      setRuns(rs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load payroll data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const monthlyTotal = employees.reduce((s, e) => s + e.salaryMinor, 0);

  async function handleAddEmployee() {
    setError(null);
    const salaryMinor = nairaToMinor(salary);
    if (!name.trim() || !accountNumber.trim() || salaryMinor === null) {
      setError('Enter a name, an account number and a salary greater than zero.');
      return;
    }
    if (!/^\d{10}$/.test(accountNumber.trim())) {
      setError('Account number must be 10 digits.');
      return;
    }
    setBusy('add');
    try {
      await api.addEmployee({
        name: name.trim(), email: email.trim(), bankCode: bankCode.trim(),
        accountNumber: accountNumber.trim(), salaryMinor, currency: 'NGN',
      });
      setName(''); setEmail(''); setAccountNumber(''); setSalary('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add employee');
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateRun() {
    setError(null);
    setBusy('create');
    try {
      await api.createPayrollRun(period);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create payroll run');
    } finally {
      setBusy(null);
    }
  }

  async function handleApprove(id: string) {
    setError(null);
    setBusy(id);
    try {
      await api.approvePayrollRun(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not approve payroll run');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
      {error && (
        <div className="glass-panel" style={{ padding: '14px 18px', color: '#fbbf24', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* ---------- Payroll runs ---------- */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Payroll runs</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Next run pays {employees.length} {employees.length === 1 ? 'employee' : 'employees'} •{' '}
              <span className="mono-figure">{formatMoney(monthlyTotal)}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={inputStyle}
              aria-label="Payroll period"
            />
            <button className="btn btn-primary" onClick={handleCreateRun} disabled={busy === 'create' || employees.length === 0}>
              {busy === 'create' ? 'Creating…' : 'Create payroll run'}
            </button>
          </div>
        </div>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}
        {!loading && runs.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No payroll runs yet. Pick a month and create the first one.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {runs.map((run) => (
            <div
              key={run.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
                background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>Run {run.period}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {run.employeeCount} {run.employeeCount === 1 ? 'employee' : 'employees'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span className="mono-figure" style={{ fontWeight: 700 }}>{formatMoney(run.totalMinor, run.currency)}</span>
                <span className={`badge ${STATUS_BADGE[run.status]}`}>{STATUS_LABEL[run.status]}</span>
                {run.status === 'PENDING_APPROVAL' && (
                  <button className="btn btn-primary" onClick={() => handleApprove(run.id)} disabled={busy === run.id}>
                    {busy === run.id ? 'Paying…' : 'Approve & pay'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Employees ---------- */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Employees</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 0' }}>Name</th>
                <th>Email</th>
                <th>Bank code</th>
                <th>Account</th>
                <th style={{ textAlign: 'right' }}>Monthly salary</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 0' }}>{e.name}</td>
                  <td>{e.email}</td>
                  <td className="mono-figure">{e.bankCode}</td>
                  <td className="mono-figure">{e.accountNumber}</td>
                  <td className="mono-figure" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatMoney(e.salaryMinor, e.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '20px' }}>
          <input style={{ ...inputStyle, flex: '1 1 160px' }} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={{ ...inputStyle, flex: '1 1 180px' }} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={{ ...inputStyle, width: '90px' }} placeholder="Bank code" value={bankCode} onChange={(e) => setBankCode(e.target.value)} />
          <input style={{ ...inputStyle, flex: '1 1 140px' }} placeholder="Account number" inputMode="numeric" maxLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          <input style={{ ...inputStyle, flex: '1 1 140px' }} placeholder="Salary in ₦" inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} />
          <button className="btn btn-secondary" onClick={handleAddEmployee} disabled={busy === 'add'}>
            {busy === 'add' ? 'Adding…' : 'Add employee'}
          </button>
        </div>
      </div>
    </section>
  );
}

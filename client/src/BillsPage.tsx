import { useEffect, useState } from 'react';
import { api } from './api/client';
import type { Bill } from './api/types';

// kobo -> naira display helper. Money is ALWAYS minor units everywhere else.
const fmt = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(minor / 100);

const inputStyle = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
  padding: '10px 16px',
  borderRadius: '8px',
  fontSize: '0.9rem',
  width: '100%',
} as const;

const badgeFor = (status: Bill['status']) =>
  status === 'PAID' ? 'badge-emerald' : status === 'PENDING' ? 'badge-amber' : 'badge-cyan';

export default function BillsPage() {
  // --- React memory: the list, the form fields, and a busy flag ---
  const [bills, setBills] = useState<Bill[]>([]);
  const [payerName, setPayerName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBills(await api.listBills());
  }

  // Load bills once when the page opens
  useEffect(() => {
    load().catch(console.error);
  }, []);

  // Controlled form: the box and the memory hold hands.
  async function createBill(e: React.FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    setBusy(true);
    try {
      await api.createBill({
        payerName,
        description,
        amountMinor: Math.round(parseFloat(amount.replace(/[,\s₦]/g, '')) * 100),
        currency: 'NGN',
      });
      setPayerName(''); setDescription(''); setAmount(''); // clear the form
      await load(); // refresh the list so the new bill appears
    } finally {
      setBusy(false);
    }
  }

  // Demo shortcut: the mock checkout "pays" the bill instantly,
  // mimicking what the real Kora webhook will do later.
  async function simulatePayment(billId: string) {
    await api.getCheckoutUrl(billId);
    await load();
  }

  return (
    <section style={{ marginBottom: '40px' }}>
      {/* Create-bill form */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Create a Bill</h2>
        <form onSubmit={createBill} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <input style={inputStyle} placeholder="Payer name (e.g. Chidi Okafor)" value={payerName}
            onChange={(e) => setPayerName(e.target.value)} required />
          <input style={inputStyle} placeholder="Description (e.g. Consultation fee)" value={description}
            onChange={(e) => setDescription(e.target.value)} required />
          <input style={inputStyle} placeholder="Amount in NGN (e.g. 5000)" value={amount}
            onChange={(e) => setAmount(e.target.value)} required inputMode="decimal" />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create Bill'}
          </button>
        </form>
      </div>

      {/* Bills list */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Bills</h2>
        {bills.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No bills yet — create one above.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 0' }}>PAYER</th>
                <th>DESCRIPTION</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 0', fontWeight: 600 }}>{b.payerName}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{b.description}</td>
                  <td className="mono-figure" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(b.amountMinor)}</td>
                  <td><span className={`badge ${badgeFor(b.status)}`}>{b.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    {b.status === 'PENDING' && (
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => simulatePayment(b.id)}>
                        Simulate Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

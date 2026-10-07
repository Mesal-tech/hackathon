import React, { useState } from 'react';
import {
  ShieldCheck,
  FileSpreadsheet,
  Cpu,
  Layers,
  Sparkles,
  Lock,
  RefreshCw,
  CreditCard,
  Building2,
  Users,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'payroll' | 'billing'>('overview');

  return (
    <>
      <div className="ambient-glow" />
      <div className="container" style={{ padding: '48px 24px', minHeight: '100vh' }}>
        {/* Top Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge badge-emerald">React.js Client</span>
              <span className="badge badge-cyan">Kora Connected</span>
              <span className="badge badge-amber">PostgreSQL RLS</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
              <span className="title-gradient">Antigravity</span> Enterprise Ledger
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
              Double-entry immutable financial ledger & autonomous Kora payment engine
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary">
              <RefreshCw size={16} /> Reconcile
            </button>
            <button className="btn btn-primary">
              <Sparkles size={16} /> AI Finance Copilot
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {(['overview', 'ledger', 'payroll', 'billing'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="btn"
              style={{
                background: activeTab === tab ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                color: activeTab === tab ? '#34d399' : 'var(--text-secondary)',
                border: activeTab === tab ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Metrics Row */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '36px',
          }}
        >
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>KORA WALLET ASSET</span>
              <span className="badge badge-emerald">Balanced</span>
            </div>
            <div className="mono-figure" style={{ fontSize: '2rem', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
              ₦48,250,000.00
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Derived from 1,420 immutable journal entries
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>PAYROLL OUTBOX QUEUE</span>
              <span className="badge badge-cyan">0 Pending</span>
            </div>
            <div className="mono-figure" style={{ fontSize: '2rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
              ₦14,800,000.00
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Maker-Checker approved • Dispatched deterministically
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>COLLECTIONS & RECEIVABLES</span>
              <span className="badge badge-amber">Active</span>
            </div>
            <div className="mono-figure" style={{ fontSize: '2rem', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>
              ₦92,410,500.00
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Webhooks HMAC verified • Re-query confirmed
            </p>
          </div>
        </section>

        {/* Tab Content Display */}
        {activeTab === 'overview' && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>System Architecture (React.js + NestJS)</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
              }}
            >
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Cpu size={20} color="#10b981" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>NestJS API Process</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Scoped PostgreSQL RLS multi-tenancy, Idempotency-Key validation, and cryptographic HMAC webhook ingress.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Layers size={20} color="#06b6d4" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Worker & Scheduler</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Transactional outbox pattern with deterministic references (`payout-&lt;id&gt;`) and daily reconciliation.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <ShieldCheck size={20} color="#8b5cf6" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Double-Entry Ledger</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Strict integer minor units (no floats), debits equal credits DB constraint trigger, and REVOKE UPDATE/DELETE.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Lock size={20} color="#f59e0b" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Maker-Checker Engine</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Policy evaluation requiring dual authorization for payroll execution, refunds, and bank modifications.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'ledger' && (
          <section className="glass-panel" style={{ padding: '24px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Live Double-Entry Journal Entries</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 0' }}>ENTRY ID</th>
                  <th>DESCRIPTION</th>
                  <th>SOURCE TYPE</th>
                  <th>DEBIT ACCOUNT</th>
                  <th>CREDIT ACCOUNT</th>
                  <th style={{ textAlign: 'right' }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="mono-figure" style={{ padding: '12px 0', color: '#38bdf8' }}>#JE-1094</td>
                  <td>Oct 2026 Payroll Execution</td>
                  <td><span className="badge badge-cyan">PAYROLL</span></td>
                  <td>PAYROLL_EXPENSE</td>
                  <td>KORA_WALLET</td>
                  <td className="mono-figure" style={{ textAlign: 'right', fontWeight: 600 }}>₦14,800,000.00</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="mono-figure" style={{ padding: '12px 0', color: '#38bdf8' }}>#JE-1093</td>
                  <td>Tuition Fee Bill Collection</td>
                  <td><span className="badge badge-emerald">BILL_PAY</span></td>
                  <td>KORA_CLEARING</td>
                  <td>BILLING_INCOME</td>
                  <td className="mono-figure" style={{ textAlign: 'right', fontWeight: 600 }}>₦750,000.00</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'payroll' && (
          <section className="glass-panel" style={{ padding: '24px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Payroll Runs & Maker-Checker</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Run #2026-10 (October 2026)</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>42 Employees • PAYE, Pension, NHF Calculated</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="mono-figure" style={{ fontWeight: 700 }}>₦14,800,000.00</span>
                  <span className="badge badge-emerald">FUNDS RESERVED</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'billing' && (
          <section className="glass-panel" style={{ padding: '24px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Public Tokenized Bill Payment Portal</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Bills are accessed via unguessable cryptographically secure tokens (/pay/[token]) with no payer PII leakage.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                readOnly
                value="https://pay.antigravity.io/pay/tok_8f93e2b104ad9871"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-mono)',
                  flex: 1,
                }}
              />
              <button className="btn btn-primary">Open Public Pay Page</button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>Antigravity Platform • React.js SPA (Vite) + NestJS Server</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>PostgreSQL RLS</span>
            <span>Redis BullMQ</span>
            <span>Kora Gateway</span>
          </div>
        </footer>
      </div>
    </>
  );
}

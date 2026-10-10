import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Cpu, Layers, Sparkles, Lock, RefreshCw } from 'lucide-react';
import { api, IS_MOCK } from './api/client';
import type { OrgMetrics } from './api/types';
import { formatMoney } from './Format';
import BillsPage from './BillsPage';
import PayrollPage from './PayrollPage';
import LedgerPage from './LedgerPage';
import PayPage from './PayPage';

/**
 * Top-level switch: /pay/<token> is the public payment page (no dashboard, no tabs).
 * Everything else is the organization dashboard.
 */
export default function App() {
  const payMatch = window.location.pathname.match(/^\/pay\/([^/]+)/);
  if (payMatch) return <PayPage token={payMatch[1]} />;
  return <Dashboard />;
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'payroll' | 'billing'>('overview');
  const [metrics, setMetrics] = useState<OrgMetrics | null>(null);

  const loadMetrics = useCallback(() => {
    api.getMetrics().then(setMetrics).catch(console.error);
  }, []);

  // Load once, then refresh every 3 seconds so the numbers move when money moves.
  useEffect(() => {
    loadMetrics();
    const timer = setInterval(loadMetrics, 3000);
    return () => clearInterval(timer);
  }, [loadMetrics]);

  const money = (minor: number | undefined) => (metrics && minor !== undefined ? formatMoney(minor, metrics.currency) : 'Loading…');

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
              {IS_MOCK ? (
                <span className="badge badge-amber">Mock data</span>
              ) : (
                <span className="badge badge-cyan">Kora Connected</span>
              )}
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
            <button className="btn btn-secondary" onClick={loadMetrics}>
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

        {/* Metrics Row (all three cards now come from the API) */}
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
              {money(metrics?.walletAssetMinor)}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Derived from {metrics ? metrics.journalEntryCount.toLocaleString() : '…'} immutable journal entries
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>PAYROLL DISPATCHED</span>
              <span className="badge badge-cyan">{metrics?.pendingOutbox ?? 0} Pending</span>
            </div>
            <div className="mono-figure" style={{ fontSize: '2rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
              {money(metrics?.payrollDispatchedMinor)}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Approved by a checker • Dispatched deterministically
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>COLLECTIONS & RECEIVABLES</span>
              <span className="badge badge-amber">Active</span>
            </div>
            <div className="mono-figure" style={{ fontSize: '2rem', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>
              {money(metrics?.collectionsMinor)}
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Approval before payout</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Payroll never leaves the wallet until an approver confirms the run.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'ledger' && <LedgerPage />}
        {activeTab === 'payroll' && <PayrollPage />}
        {activeTab === 'billing' && <BillsPage />}

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
            <span>Transactional outbox</span>
            <span>Kora Gateway</span>
          </div>
        </footer>
      </div>
    </>
  );
}

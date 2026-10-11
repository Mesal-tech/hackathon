import React from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/clerk-react';
import { useAuthSetup } from './ClerkAuthProvider';
import {
  Lock,
  ShieldCheck,
  Sparkles,
  Building2,
  Cpu,
  Layers,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  title = 'Enterprise Authorization Required',
  description = 'All ledger journals, payroll outbox pipelines, and financial routes are restricted to verified organization members. Sign in with Clerk to access the platform.',
}) => {
  const { hasValidClerkKey, isDemoMode, setIsDemoMode } = useAuthSetup();

  const renderAuthGate = () => (
    <div style={{ maxWidth: '820px', margin: '40px auto 60px' }}>
      {/* Central Login Card */}
      <div
        className="glass-panel"
        style={{
          padding: '56px 40px',
          textAlign: 'center',
          borderRadius: '24px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top subtle glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
          }}
        />

        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.1))',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: '#34d399',
            boxShadow: '0 0 24px rgba(16, 185, 129, 0.25)',
          }}
        >
          <Lock size={36} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span className="badge badge-emerald">Clerk SSO Protected</span>
          <span className="badge badge-cyan">Zero Trust Architecture</span>
          <span className="badge badge-amber">PostgreSQL RLS Enforced</span>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>
          {title}
        </h2>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '1rem',
            lineHeight: '1.6',
            maxWidth: '580px',
            margin: '0 auto 32px',
          }}
        >
          {description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '40px' }}>
          <SignInButton mode="modal">
            <button
              className="btn btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '10px',
              }}
            >
              <Lock size={18} /> Sign In with Clerk
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button
              className="btn btn-secondary"
              style={{
                padding: '14px 28px',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '10px',
              }}
            >
              <Sparkles size={18} /> Register Organization
            </button>
          </SignUpButton>
        </div>

        {/* Security architecture highlights */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            textAlign: 'left',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '28px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ color: '#10b981', marginTop: '2px' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Immutable Ledger
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Strict integer minor units & debits = credits trigger
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ color: '#06b6d4', marginTop: '2px' }}>
              <Cpu size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Multi-Tenant RLS
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Database row-level security isolated per tenant
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ color: '#f59e0b', marginTop: '2px' }}>
              <Building2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Maker-Checker
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Dual authorization before payouts or fund departure
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // If live Clerk key is active, use Clerk's native SignedIn/SignedOut components
  if (hasValidClerkKey) {
    return (
      <>
        <SignedIn>{children}</SignedIn>
        <SignedOut>{renderAuthGate()}</SignedOut>
      </>
    );
  }

  // Fallback demo authentication state when Clerk key is pending
  if (isDemoMode) {
    return (
      <>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            padding: '10px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
            <Building2 size={16} />
            <span>Simulated Clerk Organization Session (Demo Mode: `org_enterprise_treasury`)</span>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={() => setIsDemoMode(false)}
          >
            Lock Platform
          </button>
        </div>
        {children}
      </>
    );
  }

  // Unauthenticated fallback prompt
  return renderAuthGate();
};

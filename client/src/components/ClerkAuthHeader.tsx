import React, { useState } from 'react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from '@clerk/clerk-react';
import { useAuthSetup } from './ClerkAuthProvider';
import { Lock, Sparkles, Key, CheckCircle, ShieldCheck, UserCheck, X } from 'lucide-react';

export const ClerkAuthHeader: React.FC = () => {
  const { hasValidClerkKey, publishableKey, setPublishableKey, isDemoMode, setIsDemoMode } =
    useAuthSetup();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [inputKey, setInputKey] = useState(publishableKey);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setPublishableKey(inputKey);
    setIsConfigOpen(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* If Live Clerk Provider is Active */}
      {hasValidClerkKey ? (
        <>
          <SignedIn>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> Clerk Authenticated
              </span>
              <UserButton afterSignOutUrl="/" showName />
            </div>
          </SignedIn>
          <SignedOut>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <SignInButton mode="modal">
                <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  <Lock size={14} /> Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  <Sparkles size={14} /> Register
                </button>
              </SignUpButton>
            </div>
          </SignedOut>
        </>
      ) : (
        /* Setup / Demo Session Controls when CLERK_PUBLISHABLE_KEY is not in env */
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem', borderStyle: 'dashed' }}
            onClick={() => setIsConfigOpen(true)}
            title="Configure Clerk Publishable Key"
          >
            <Key size={14} /> Clerk Key
          </button>

          {isDemoMode ? (
            <button
              className="btn btn-secondary"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#34d399',
              }}
              onClick={() => setIsDemoMode(false)}
            >
              <UserCheck size={14} /> Demo Signed In
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => setIsDemoMode(true)}
            >
              <Lock size={14} /> Sign In (Demo)
            </button>
          )}
        </div>
      )}

      {/* Clerk Key Configuration Modal */}
      {isConfigOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={20} color="#10b981" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Connect Clerk Authentication</h3>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Paste your Clerk Publishable Key (`pk_test_...` or `pk_live_...`) to activate Clerk SSO, session tokens, and UserButton.
              You can also specify it in <code>client/.env</code> as <code>VITE_CLERK_PUBLISHABLE_KEY</code>.
            </p>

            <form onSubmit={handleSaveKey}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Clerk Publishable Key
                </label>
                <input
                  type="text"
                  placeholder="pk_test_..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'white',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsConfigOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

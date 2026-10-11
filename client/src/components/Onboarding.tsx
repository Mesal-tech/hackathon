import React, { useState, useEffect } from 'react';
import { useUser, UserButton, SignInButton, useClerk } from '@clerk/clerk-react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import { OrganizationDetails } from './OrganizationOnboarding';

interface OnboardingProps {
  onComplete?: (details: OrganizationDetails) => void;
  initialStep?: 1 | 2;
}

export const Onboarding: React.FC<OnboardingProps> = ({
  onComplete,
  initialStep = 1,
}) => {
  const { user, isSignedIn } = useUser();
  const clerk = useClerk();

  const [step, setStep] = useState<1 | 2>(initialStep);

  // If user is not signed in, do not render onboarding form
  if (!isSignedIn) {
    return null;
  }

  // Extract organization name automatically from Clerk
  const clerkOrgName =
    user?.organizationMemberships?.[0]?.organization?.name ||
    (user?.unsafeMetadata?.organizationName as string) ||
    (user?.publicMetadata?.organizationName as string) ||
    (user?.firstName ? `${user.firstName}'s Enterprise` : '') ||
    'Acme Technologies Ltd';

  // Greeting name: user's first name from Clerk or default to 'there'
  const userName = user?.firstName || 'there';

  // Form State
  const [country, setCountry] = useState('Nigeria (NG)');
  const [language, setLanguage] = useState('English');
  const [orgName, setOrgName] = useState(clerkOrgName);
  const [orgType, setOrgType] = useState<'COMPANY' | 'SCHOOL' | 'HOSPITAL'>('COMPANY');
  const [baseCurrency, setBaseCurrency] = useState('NGN');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (clerkOrgName && (!orgName || orgName === 'Acme Technologies Ltd')) {
      setOrgName(clerkOrgName);
    }
  }, [clerkOrgName]);

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else {
      setIsSubmitting(true);
      const details: OrganizationDetails = {
        name: orgName.trim() || clerkOrgName,
        type: orgType,
        country: country.includes('Nigeria') || country.includes('NG') ? 'NG' : country.includes('USA') ? 'US' : country,
        baseCurrency,
        registrationNumber: 'N/A',
        industry: 'Technology & Software',
        dualApprovalThreshold: 1000000,
        settlementBank: 'Kora Settlement Account',
        accountNumber: '',
      };

      try {
        await fetch('/api/v1/auth/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer clerk_token',
          },
          body: JSON.stringify({
            orgName: details.name,
            orgType: details.type,
            country: details.country,
            baseCurrency: details.baseCurrency,
            registrationNumber: details.registrationNumber,
            industry: details.industry,
            dualApprovalThreshold: details.dualApprovalThreshold,
          }),
        }).catch(() => { });
      } finally {
        setIsSubmitting(false);
        if (onComplete) {
          onComplete(details);
        }
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(1);
    }
  };

  return (
    <div className="dreamwork-viewport">
      {/* =========================================================================
          MAIN CENTERED MODAL / CONTAINER (Split 2-Column Responsive Layout)
          ========================================================================= */}
      <div className="dreamwork-modal">
        {/* =====================================================================
            LEFT COLUMN: ONBOARDING FORM
            ===================================================================== */}
        <div className="dreamwork-form-col">
          {/* Top Bar: Back button, Logo, Clerk status & Progress Line */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={step === 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: step > 1 ? '#e2e8f0' : 'rgba(255, 255, 255, 0.3)',
                    cursor: step > 1 ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  title="Previous Step"
                >
                  <ArrowLeft size={18} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc', letterSpacing: '-0.01em' }}>
                    X-Flow
                  </span>
                </div>
              </div>

              {/* Clerk User Button if signed in, or Sign In Button if signed out */}
              <div>
                {isSignedIn && (
                  <UserButton showName={false} />
                )}
              </div>
            </div>

            {/* Horizontal Step Progress Bar (2 Steps) */}
            <div
              style={{
                width: '100%',
                height: '2px',
                background: '#242836',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: step === 1 ? '50%' : '100%',
                  background: '#ffffff',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Form Content Body */}
          <div style={{ margin: '24px 0' }}>
            <div style={{ fontSize: '0.78rem', color: '#6d758d', fontWeight: 600, marginBottom: '8px' }}>
              Step {step} of 2
            </div>

            {/* STEP 1: Country & Spoken Language */}
            {step === 1 && (
              <>
                <h1 className="dreamwork-heading">
                  Hi, {userName}! What's <br />
                  your origin story?
                </h1>

                {/* Field 1: Which country do you live in? */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#8b94a7', marginBottom: '8px', fontWeight: 500 }}>
                    Which country do you live in?
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '13px 40px 13px 16px',
                        background: '#191c26',
                        border: '1px solid #282d3d',
                        borderRadius: '12px',
                        color: '#cbd5e1',
                        fontSize: '0.9rem',
                        appearance: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Nigeria (NG)">Nigeria (NG)</option>
                      <option value="USA">USA</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Germany">Germany</option>
                    </select>
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <ChevronsUpDown size={16} />
                    </div>
                  </div>
                </div>

                {/* Field 2: What language(s) do you speak? */}
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#8b94a7', marginBottom: '8px', fontWeight: 500 }}>
                    What language(s) do you speak?
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '13px 40px 13px 16px',
                        background: '#191c26',
                        border: '1px solid #282d3d',
                        borderRadius: '12px',
                        color: '#cbd5e1',
                        fontSize: '0.9rem',
                        appearance: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="English">English</option>
                      <option value="French">French</option>
                      <option value="Spanish">Spanish</option>
                      <option value="German">German</option>
                    </select>
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: Organization Name & Currency */}
            {step === 2 && (
              <>
                <h1 className="dreamwork-heading">
                  Tell us about your <br />
                  organization
                </h1>

                {/* Organization Name (retrieved from Clerk) */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#8b94a7', marginBottom: '6px', fontWeight: 500 }}>
                    Organization legal name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Technologies Ltd"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#191c26',
                      border: '1px solid #282d3d',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Entity Type */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#8b94a7', marginBottom: '6px', fontWeight: 500 }}>
                    Operating entity structure
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '12px 40px 12px 16px',
                        background: '#191c26',
                        border: '1px solid #282d3d',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                        appearance: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="COMPANY">Corporate / Technology Enterprise</option>
                      <option value="SCHOOL">Educational Institution / School</option>
                      <option value="HOSPITAL">Healthcare & Hospital Provider</option>
                    </select>
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                {/* Base Currency */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#8b94a7', marginBottom: '6px', fontWeight: 500 }}>
                    Base ledger currency
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={baseCurrency}
                      onChange={(e) => setBaseCurrency(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 40px 12px 16px',
                        background: '#191c26',
                        border: '1px solid #282d3d',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                        appearance: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="NGN">NGN - Nigerian Naira (₦)</option>
                      <option value="USD">USD - United States Dollar ($)</option>
                      <option value="GBP">GBP - British Pound Sterling (£)</option>
                      <option value="EUR">EUR - Euro (€)</option>
                    </select>
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom Action Button (Glowing Cyan Pill Button) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="dreamwork-continue-btn"
            >
              <span>{isSubmitting ? 'Finalizing...' : step === 2 ? 'Complete Setup' : 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* =====================================================================
            RIGHT COLUMN: SHOWCASE (PORTRAITS)
            ===================================================================== */}
        <div className="dreamwork-showcase-col">
          {/* Headline */}
          <div>
            <h2
              style={{
                fontSize: '1.65rem',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Take your organization <br />
              to the next level
            </h2>
          </div>

          {/* Staggered Vertical Portrait Cards Container */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '310px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '6px',
            }}
          >
            {/* Portrait 1: Blonde woman with orange folder */}
            <div
              style={{
                width: '108px',
                height: '220px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#e05324',
                transform: 'translateY(-18px)',
                boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
                position: 'relative',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
                alt="Member 1"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Portrait 2: Man with glasses & teal background */}
            <div
              style={{
                width: '108px',
                height: '210px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#0d7488',
                transform: 'translateY(22px)',
                boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
                position: 'relative',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80"
                alt="Member 2"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Portrait 3: Woman in hijab & pink jacket holding notebook */}
            <div
              style={{
                width: '108px',
                height: '235px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#be185d',
                transform: 'translateY(-8px)',
                boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
                position: 'relative',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                alt="Member 3"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Bottom Right Brand Wordmark */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#cbd5e1', letterSpacing: '-0.01em' }}>
              X-Flow
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

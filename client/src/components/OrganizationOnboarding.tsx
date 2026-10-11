import React, { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import {
  Building2,
  GraduationCap,
  Stethoscope,
  Globe,
  Coins,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
  Layers,
  Sliders,
  Landmark,
  FileCheck,
} from 'lucide-react';

export interface OrganizationDetails {
  name: string;
  type: 'COMPANY' | 'SCHOOL' | 'HOSPITAL';
  country: string;
  baseCurrency: string;
  registrationNumber: string;
  industry: string;
  dualApprovalThreshold: number;
  settlementBank: string;
  accountNumber: string;
}

interface OrganizationOnboardingProps {
  onComplete: (details: OrganizationDetails) => void;
}

export const OrganizationOnboarding: React.FC<OrganizationOnboardingProps> = ({ onComplete }) => {
  const { user } = useUser();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Extract organization name automatically from Clerk
  const clerkOrgName =
    user?.organizationMemberships?.[0]?.organization?.name ||
    (user?.unsafeMetadata?.organizationName as string) ||
    (user?.publicMetadata?.organizationName as string) ||
    (user?.firstName ? `${user.firstName}'s Organization` : '') ||
    'Antigravity Enterprise';

  const [orgName, setOrgName] = useState(clerkOrgName);
  const [orgType, setOrgType] = useState<'COMPANY' | 'SCHOOL' | 'HOSPITAL'>('COMPANY');
  const [country, setCountry] = useState('NG');
  const [baseCurrency, setBaseCurrency] = useState('NGN');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [industry, setIndustry] = useState('Technology & Software');
  const [dualApprovalThreshold, setDualApprovalThreshold] = useState('1000000');
  const [settlementBank, setSettlementBank] = useState('044 - Access Bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (clerkOrgName && !orgName) {
      setOrgName(clerkOrgName);
    }
  }, [clerkOrgName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const details: OrganizationDetails = {
      name: orgName.trim() || clerkOrgName,
      type: orgType,
      country,
      baseCurrency,
      registrationNumber: registrationNumber.trim(),
      industry,
      dualApprovalThreshold: parseFloat(dualApprovalThreshold) || 1000000,
      settlementBank,
      accountNumber: accountNumber.trim(),
    };

    try {
      // Sync with backend onboarding endpoint
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
      }).catch(() => {});
    } finally {
      setIsSubmitting(false);
      onComplete(details);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#090d16',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          width: '100%',
          maxWidth: '760px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
            }}
          >
            A
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
              Antigravity <span className="title-gradient">Ledger</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Institutional Onboarding Engine
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge badge-emerald">Clerk Verified</span>
          <UserButton showName />
        </div>
      </header>

      {/* Main Container Card */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '760px',
          padding: '40px',
          borderRadius: '24px',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 32px rgba(16, 185, 129, 0.08)',
        }}
      >
        {/* Progress Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          {[
            { num: 1, title: 'Entity Profile' },
            { num: 2, title: 'Ledger & Currency' },
            { num: 3, title: 'Governance & Payout' },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: step === s.num ? 'var(--gradient-brand)' : step > s.num ? '#10b981' : 'var(--bg-tertiary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: step === s.num ? '0 0 16px rgba(16, 185, 129, 0.4)' : 'none',
                  }}
                >
                  {step > s.num ? <CheckCircle2 size={16} /> : s.num}
                </div>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: step === s.num ? 700 : 500,
                    color: step === s.num ? '#34d399' : 'var(--text-secondary)',
                  }}
                >
                  {s.title}
                </span>
              </div>
              {idx < 2 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    background: step > idx + 1 ? '#10b981' : 'var(--border-subtle)',
                    margin: '0 12px',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* STEP 1: Entity Profile */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>
                Setup Organization Entity
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                We retrieved your organization name from Clerk. Select your operating structure and industry.
              </p>
            </div>

            {/* Organization Name Field (Pre-filled from Clerk) */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Organization Legal Name
                </label>
                <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                  <CheckCircle2 size={12} /> Retrieved from Clerk
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Corporation Ltd"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {/* Organization Type Selector Cards */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Organization Entity Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {[
                  {
                    type: 'COMPANY' as const,
                    title: 'Corporate / Tech',
                    desc: 'Enterprises, tech startups, SMEs & holding companies',
                    icon: <Building2 size={24} color="#10b981" />,
                  },
                  {
                    type: 'SCHOOL' as const,
                    title: 'Educational Institution',
                    desc: 'Universities, academies & fee collection programs',
                    icon: <GraduationCap size={24} color="#06b6d4" />,
                  },
                  {
                    type: 'HOSPITAL' as const,
                    title: 'Healthcare & Hospital',
                    desc: 'Medical centers, clinics & patient billing systems',
                    icon: <Stethoscope size={24} color="#f59e0b" />,
                  },
                ].map((item) => (
                  <div
                    key={item.type}
                    onClick={() => setOrgType(item.type)}
                    style={{
                      padding: '18px',
                      borderRadius: '12px',
                      background: orgType === item.type ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-tertiary)',
                      border: orgType === item.type ? '1.5px solid #10b981' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>{item.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px', color: orgType === item.type ? '#34d399' : 'white' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Industry Selector */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Industry & Operating Sector
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.95rem',
                }}
              >
                <option value="Technology & Software">Technology & Software</option>
                <option value="Financial Services & Fintech">Financial Services & Fintech</option>
                <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                <option value="Higher Education & Academy">Higher Education & Academy</option>
                <option value="Manufacturing & Retail">Manufacturing & Retail</option>
                <option value="Energy & Infrastructure">Energy & Infrastructure</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(2)}
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              >
                Continue to Ledger Setup <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Ledger & Jurisdiction */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>
                Jurisdiction & Base Ledger Currency
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Configure multi-currency double-entry ledger parameters and legal registration details.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Country of Incorporation
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.95rem',
                  }}
                >
                  <option value="NG">Nigeria (NG) 🇳🇬</option>
                  <option value="GH">Ghana (GH) 🇬🇭</option>
                  <option value="KE">Kenya (KE) 🇰🇪</option>
                  <option value="GB">United Kingdom (GB) 🇬🇧</option>
                  <option value="US">United States (US) 🇺🇸</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Base Ledger Currency (Integer Minor Units)
                </label>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.95rem',
                  }}
                >
                  <option value="NGN">NGN - Nigerian Naira (₦)</option>
                  <option value="USD">USD - United States Dollar ($)</option>
                  <option value="GBP">GBP - British Pound Sterling (£)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Corporate Registration / RC / Tax ID Number
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. RC-1938204 or TIN-9482019"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
                Used for institutional statutory filings and Kora KYB verification tiers.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
                style={{ padding: '12px 24px' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(3)}
                style={{ padding: '12px 28px' }}
              >
                Continue to Governance <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Governance & Maker-Checker */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>
                Maker-Checker Governance & Payouts
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Define dual-authorization thresholds for money movement and designate settlement routing.
              </p>
            </div>

            {/* Maker-Checker Threshold */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Dual-Authorization Threshold ({baseCurrency})
              </label>
              <input
                type="number"
                value={dualApprovalThreshold}
                onChange={(e) => setDualApprovalThreshold(e.target.value)}
                placeholder="1000000"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '1rem',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
                Disbursements exceeding this amount require secondary Maker-Checker sign-off before Kora dispatch.
              </p>
            </div>

            {/* Settlement Bank */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Primary Settlement Bank
                </label>
                <select
                  value={settlementBank}
                  onChange={(e) => setSettlementBank(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.95rem',
                  }}
                >
                  <option value="044 - Access Bank">044 - Access Bank</option>
                  <option value="058 - GTBank">058 - Guaranty Trust Bank</option>
                  <option value="057 - Zenith Bank">057 - Zenith Bank</option>
                  <option value="011 - First Bank">011 - First Bank of Nigeria</option>
                  <option value="033 - United Bank for Africa">033 - United Bank for Africa</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Settlement Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="0123456789"
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
            </div>

            {/* Summary Box */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '28px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <ShieldCheck size={24} color="#10b981" />
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.4' }}>
                <strong>Institutional Multi-Tenancy Scope:</strong> Your organization{' '}
                <span style={{ color: '#34d399' }}>{orgName}</span> will be isolated via PostgreSQL Row-Level Security
                and initialized with immutable double-entry chart of accounts.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(2)}
                style={{ padding: '12px 24px' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: 700 }}
              >
                {isSubmitting ? (
                  'Initializing Ledger...'
                ) : (
                  <>
                    <Sparkles size={16} /> Complete Setup & Launch Platform
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

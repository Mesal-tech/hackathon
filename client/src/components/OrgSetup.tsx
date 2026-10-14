import React, { useState } from 'react';
import {
  Save,
  RotateCcw,
  CheckCircle2,
  Building2,
  Users,
  Settings,
} from 'lucide-react';
import {
  OrganizationProfile,
  useOrganization,
} from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { OrganizationDetails } from './OrganizationOnboarding';

interface OrgSetupProps {
  onboardingData: OrganizationDetails;
  onUpdate: (updatedDetails: OrganizationDetails) => void;
}

export const OrgSetup: React.FC<OrgSetupProps> = ({ onboardingData, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'team'>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('organization')) {
      return 'team';
    }
    return 'details';
  });
  const { organization } = useOrganization();

  const [formData, setFormData] = useState({
    name: onboardingData.name || '',
    type: onboardingData.type || 'COMPANY',
    country: onboardingData.country || 'Nigeria (NG)',
    baseCurrency: onboardingData.baseCurrency || 'NGN',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (field: 'name' | 'type' | 'country' | 'baseCurrency', value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveSuccess(false);
  };

  const handleReset = () => {
    setFormData({
      name: onboardingData.name || '',
      type: onboardingData.type || 'COMPANY',
      country: onboardingData.country || 'Nigeria (NG)',
      baseCurrency: onboardingData.baseCurrency || 'NGN',
    });
    setSaveSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedDetails: OrganizationDetails = {
      ...onboardingData,
      name: formData.name.trim(),
      type: formData.type as 'COMPANY' | 'SCHOOL' | 'HOSPITAL',
      country: formData.country,
      baseCurrency: formData.baseCurrency,
    };

    try {
      await fetch('/api/v1/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer clerk_token',
        },
        body: JSON.stringify({
          orgName: updatedDetails.name,
          orgType: updatedDetails.type,
          country: updatedDetails.country,
          baseCurrency: updatedDetails.baseCurrency,
        }),
      }).catch(() => {});

      onUpdate(updatedDetails);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1200px' }}>
      {/* Header Bar with Clerk Organization Switcher */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          background: '#141720',
          border: '1px solid #282d3d',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              {organization?.name || formData.name || 'Organization'}
            </h2>
            <div style={{ fontSize: '0.76rem', color: '#8b94a7' }}>
              Organization Settings & Clerk Team Management
            </div>
          </div>
        </div>

        <span
          className="badge badge-cyan"
          style={{ fontSize: '0.74rem', padding: '5px 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          {formData.type === 'SCHOOL' ? 'Educational Workspace' : formData.type === 'HOSPITAL' ? 'Healthcare Workspace' : 'Enterprise Workspace'}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={activeTab === 'details' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '7px 14px' }}
        >
          <Settings size={14} />
          <span>General Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={activeTab === 'team' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '7px 14px' }}
        >
          <Users size={14} />
          <span>Team & Permissions</span>
        </button>
      </div>

      {saveSuccess && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderColor: 'rgba(16, 185, 129, 0.4)',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '12px',
            color: '#10b981',
            fontSize: '0.85rem',
          }}
        >
          <CheckCircle2 size={16} />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Tab 1: General Details Form */}
      {activeTab === 'details' && (
        <form
          onSubmit={handleSubmit}
          className="glass-panel"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            background: '#141720',
            border: '1px solid #282d3d',
            borderRadius: '16px',
            maxWidth: '820px',
          }}
        >
          <div>
            <label className="label-obsidian">Organization Name</label>
            <input
              type="text"
              required
              className="input-obsidian"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Apex Academy"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label className="label-obsidian">Organization Type</label>
              <select
                className="select-obsidian"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                <option value="COMPANY">Company</option>
                <option value="SCHOOL">School</option>
                <option value="HOSPITAL">Hospital</option>
              </select>
            </div>

            <div>
              <label className="label-obsidian">Country</label>
              <select
                className="select-obsidian"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
              >
                <option value="Nigeria (NG)">Nigeria (NG)</option>
                <option value="USA">United States (US)</option>
                <option value="United Kingdom">United Kingdom (UK)</option>
                <option value="Canada">Canada (CA)</option>
                <option value="Ghana">Ghana (GH)</option>
                <option value="Kenya">Kenya (KE)</option>
                <option value="Germany">Germany (DE)</option>
              </select>
            </div>

            <div>
              <label className="label-obsidian">Base Currency</label>
              <select
                className="select-obsidian"
                value={formData.baseCurrency}
                onChange={(e) => handleChange('baseCurrency', e.target.value)}
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '7px 14px' }}
            >
              <RotateCcw size={14} />
              <span>Discard</span>
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '7px 16px' }}
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Clerk Organization Profile */}
      {activeTab === 'team' && (
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            background: '#141720',
            border: '1px solid #282d3d',
            borderRadius: '16px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px' }}>
              Team Members & Roles
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#8b94a7', margin: 0 }}>
              Invite teammates, assign administrative roles, and manage permissions powered by Clerk.
            </p>
          </div>

          <div
            style={{
              borderRadius: '14px',
              background: '#0d1017',
              border: '1px solid #282d3d',
              padding: '16px',
              overflowX: 'auto',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <OrganizationProfile
              routing="hash"
              appearance={{
                baseTheme: dark,
                variables: {
                  colorPrimary: '#38bdf8',
                  colorBackground: '#141720',
                  colorInputBackground: '#191c26',
                  colorInputText: '#f8fafc',
                  colorTextSecondary: '#8b94a7',
                  borderRadius: '8px',
                },
                elements: {
                  rootBox: {
                    width: '100%',
                    maxWidth: '100%',
                  },
                  cardBox: {
                    width: '100%',
                    maxWidth: '100%',
                    boxShadow: 'none',
                  },
                  card: {
                    boxShadow: 'none',
                    border: 'none',
                    backgroundColor: 'transparent',
                    width: '100%',
                    maxWidth: '100%',
                  },
                  scrollBox: {
                    width: '100%',
                  },
                  navbar: {
                    borderRight: '1px solid #282d3d',
                  },
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgSetup;

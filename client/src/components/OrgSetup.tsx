import React, { useState } from 'react';
import { Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { OrganizationDetails } from './OrganizationOnboarding';

interface OrgSetupProps {
  onboardingData: OrganizationDetails;
  onUpdate: (updatedDetails: OrganizationDetails) => void;
}

export const OrgSetup: React.FC<OrgSetupProps> = ({ onboardingData, onUpdate }) => {
  const [formData, setFormData] = useState<OrganizationDetails>({
    name: onboardingData.name || '',
    type: onboardingData.type || 'COMPANY',
    country: onboardingData.country || 'Nigeria (NG)',
    baseCurrency: onboardingData.baseCurrency || 'NGN',
    registrationNumber: onboardingData.registrationNumber || '',
    industry: onboardingData.industry || 'Technology & Software',
    dualApprovalThreshold: onboardingData.dualApprovalThreshold || 1000000,
    settlementBank: onboardingData.settlementBank || '',
    accountNumber: onboardingData.accountNumber || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (field: keyof OrganizationDetails, value: any) => {
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
      registrationNumber: onboardingData.registrationNumber || '',
      industry: onboardingData.industry || 'Technology & Software',
      dualApprovalThreshold: onboardingData.dualApprovalThreshold || 1000000,
      settlementBank: onboardingData.settlementBank || '',
      accountNumber: onboardingData.accountNumber || '',
    });
    setSaveSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await fetch('/api/v1/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer clerk_token',
        },
        body: JSON.stringify({
          orgName: formData.name.trim(),
          orgType: formData.type,
          country: formData.country,
          baseCurrency: formData.baseCurrency,
        }),
      }).catch(() => {});

      onUpdate(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
      {saveSuccess && (
        <div
          className="glass-panel"
          style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderColor: 'rgba(56, 189, 248, 0.4)',
            background: 'rgba(56, 189, 248, 0.1)',
            borderRadius: '14px',
          }}
        >
          <CheckCircle2 size={18} color="#38bdf8" />
          <span style={{ fontSize: '0.88rem', color: '#f8fafc' }}>
            Settings saved successfully.
          </span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="glass-panel"
        style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        <div>
          <label className="label-obsidian">Organization Name</label>
          <input
            type="text"
            required
            className="input-obsidian"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Organization legal name"
          />
        </div>

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
          <label className="label-obsidian">Currency</label>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw size={15} />
            <span>Discard</span>
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving}
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
export default OrgSetup;

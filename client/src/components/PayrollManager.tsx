import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Send,
  CheckCircle2,
  Calendar,
  Building2,
  Layers,
  Search,
  Filter,
  CreditCard,
  Trash2,
  ExternalLink,
  Zap,
  Check,
  Copy,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  X,
  ArrowRight,
  ShieldCheck,
  Banknote,
  DollarSign,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export interface Employee {
  id: string;
  orgId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  salaryMinor: number;
  currency: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  joinedAt: string;
}

export interface PayrollRunLine {
  employeeId: string;
  employeeName: string;
  department: string;
  bankName: string;
  accountNumber: string;
  amountMinor: number;
  status: 'PENDING' | 'DISBURSED';
}

export interface PayrollRunRecord {
  id: string;
  orgId: string;
  period: string;
  department?: string;
  employeeCount: number;
  amountMinor: number;
  currency: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'FUNDS_RESERVED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  disbursementRef?: string;
  lines: PayrollRunLine[];
}

export interface PayrollStats {
  totalStaff: number;
  activeStaff: number;
  monthlyCommitmentMinor: number;
  totalDisbursedMinor: number;
  pendingRunsCount: number;
}

interface PayrollManagerProps {
  baseCurrency: string;
  orgName: string;
  onDisbursementCompleted?: () => void;
}

const NIGERIAN_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '057', name: 'Zenith Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '090267', name: 'Kuda Microfinance Bank' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '035', name: 'Wema Bank / ALAT' },
];

export const PayrollManager: React.FC<PayrollManagerProps> = ({
  baseCurrency,
  orgName,
  onDisbursementCompleted,
}) => {
  const [subTab, setSubTab] = useState<'runs' | 'directory' | 'departments'>('runs');

  // Server state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollRunRecord[]>([]);
  const [stats, setStats] = useState<PayrollStats>({
    totalStaff: 0,
    activeStaff: 0,
    monthlyCommitmentMinor: 0,
    totalDisbursedMinor: 0,
    pendingRunsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');

  // Modal states
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [activeRunBreakdown, setActiveRunBreakdown] = useState<PayrollRunRecord | null>(null);

  // Form states: New Run
  const [newRunPeriod, setNewRunPeriod] = useState(
    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );
  const [newRunDept, setNewRunDept] = useState('all');

  // Form states: Single Payout
  const [singleEmployeeId, setSingleEmployeeId] = useState('');
  const [singleAmount, setSingleAmount] = useState('');
  const [singleNarration, setSingleNarration] = useState('');

  // Form states: New Employee
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpBankCode, setNewEmpBankCode] = useState('058');
  const [newEmpAccountNum, setNewEmpAccountNum] = useState('');
  const [newEmpSalary, setNewEmpSalary] = useState('');

  // UI feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const currencySymbol = baseCurrency === 'USD' ? '$' : baseCurrency === 'GBP' ? '£' : baseCurrency === 'EUR' ? '€' : '₦';

  const formatCurrency = (minor: number | undefined | null) => {
    const num = Number(minor);
    const safeMinor = Number.isFinite(num) ? num : 0;
    const isNegative = safeMinor < 0;
    const abs = Math.abs(safeMinor) / 100;
    return `${isNegative ? '-' : ''}${currencySymbol}${abs.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch all payroll data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configRes, runsRes] = await Promise.all([
        fetch('/api/v1/payroll/config', {
          headers: { Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
        }),
        fetch('/api/v1/payroll/runs', {
          headers: { Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
        }),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setEmployees(configData.employees || []);
        if (configData.stats) setStats(configData.stats);
      }

      if (runsRes.ok) {
        const runsData = await runsRes.json();
        setRuns(runsData.runs || []);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgName]);

  const departmentsList = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  // Advance run lifecycle (Maker-Checker)
  const handleAdvanceRun = async (runId: string) => {
    try {
      setIsActionBusy(true);
      const res = await fetch(`/api/v1/payroll/runs/${runId}/advance`, {
        method: 'POST',
        headers: { Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
      });

      if (res.ok) {
        const data = await res.json();
        setRuns((prev) => prev.map((r) => (r.id === runId ? data.run : r)));
        showToast(`Payroll run advanced to ${data.run.status}`);
        fetchData();
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.message || 'Failed to advance run');
      }
    } catch {
      showToast('Action failed');
    } finally {
      setIsActionBusy(false);
    }
  };

  // Execute full institutional disbursement
  const handleDisburseRun = async (runId: string) => {
    try {
      setIsActionBusy(true);
      const res = await fetch(`/api/v1/payroll/runs/${runId}/disburse`, {
        method: 'POST',
        headers: { Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
      });

      if (res.ok) {
        const data = await res.json();
        setRuns((prev) => prev.map((r) => (r.id === runId ? data.run : r)));
        showToast(`Disbursed ${formatCurrency(data.run.amountMinor)} to ${data.run.employeeCount} staff!`);
        fetchData();
        onDisbursementCompleted?.();
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.message || 'Disbursement execution failed');
      }
    } catch {
      showToast('Disbursement execution failed');
    } finally {
      setIsActionBusy(false);
    }
  };

  // Create new payroll run
  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRunPeriod.trim()) return;

    try {
      setIsActionBusy(true);
      const res = await fetch('/api/v1/payroll/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer clerk_token',
          'x-org-id': orgName,
        },
        body: JSON.stringify({
          period: newRunPeriod.trim(),
          department: newRunDept,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRuns([data.run, ...runs]);
        setIsRunModalOpen(false);
        showToast(`Created draft payroll run for ${data.run.period}!`);
        fetchData();
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.message || 'Failed to create payroll run');
      }
    } catch {
      showToast('Failed to create payroll run');
    } finally {
      setIsActionBusy(false);
    }
  };

  // Execute single payout
  const handleSingleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEmployeeId) {
      showToast('Select an employee / payee');
      return;
    }

    const amountMinor = singleAmount ? Math.round(parseFloat(singleAmount) * 100) : undefined;

    try {
      setIsActionBusy(true);
      const res = await fetch('/api/v1/payroll/disburse-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer clerk_token',
          'x-org-id': orgName,
        },
        body: JSON.stringify({
          employeeId: singleEmployeeId,
          amountMinor,
          narration: singleNarration.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsSingleModalOpen(false);
        setSingleAmount('');
        setSingleNarration('');
        showToast(data.message || 'Payout disbursed successfully!');
        fetchData();
        onDisbursementCompleted?.();
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.message || 'Payout failed');
      }
    } catch {
      showToast('Payout failed');
    } finally {
      setIsActionBusy(false);
    }
  };

  // Add new employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpDept.trim() || !newEmpAccountNum.trim() || !newEmpSalary) {
      showToast('Please fill all required fields');
      return;
    }

    const bankObj = NIGERIAN_BANKS.find((b) => b.code === newEmpBankCode);

    try {
      setIsActionBusy(true);
      const res = await fetch('/api/v1/payroll/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer clerk_token',
          'x-org-id': orgName,
        },
        body: JSON.stringify({
          name: newEmpName.trim(),
          email: newEmpEmail.trim() || undefined,
          department: newEmpDept.trim(),
          role: newEmpRole.trim() || undefined,
          bankCode: newEmpBankCode,
          bankName: bankObj?.name || 'Commercial Bank',
          accountNumber: newEmpAccountNum.trim(),
          salaryMinor: Math.round(parseFloat(newEmpSalary) * 100),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmployees([data.employee, ...employees]);
        setIsAddEmployeeModalOpen(false);
        setNewEmpName('');
        setNewEmpEmail('');
        setNewEmpRole('');
        setNewEmpAccountNum('');
        setNewEmpSalary('');
        showToast(`Enrolled ${data.employee.name} in ${data.employee.department}!`);
        fetchData();
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.message || 'Failed to add employee');
      }
    } catch {
      showToast('Failed to add employee');
    } finally {
      setIsActionBusy(false);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from payroll roster?`)) return;
    try {
      const res = await fetch(`/api/v1/payroll/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
      });
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        showToast(`Removed ${name} from roster.`);
        fetchData();
      }
    } catch {
      showToast('Failed to remove employee');
    }
  };

  // Load preset template
  const handleLoadTemplate = async (template: 'SCHOOL' | 'HOSPITAL' | 'COMPANY') => {
    try {
      const res = await fetch('/api/v1/payroll/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer clerk_token',
          'x-org-id': orgName,
        },
        body: JSON.stringify({ template }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setRuns(data.runs || []);
        if (data.stats) setStats(data.stats);
        showToast(`Loaded ${template} payroll roster & presets!`);
      }
    } catch {
      showToast('Template load failed');
    }
  };

  // Filtered runs
  const filteredRuns = runs.filter((r) => {
    const matchesDept = filterDept === 'all' || r.department === filterDept || r.department === 'All Departments';
    const matchesSearch =
      r.period.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.department && r.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  // Filtered employees
  const filteredEmployees = employees.filter((e) => {
    const matchesDept = filterDept === 'all' || e.department === filterDept;
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.accountNumber.includes(searchQuery) ||
      e.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            padding: '14px 22px',
            background: '#191c26',
            borderColor: '#38bdf8',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 12px 35px rgba(0,0,0,0.6)',
            borderRadius: '14px',
          }}
        >
          <CheckCircle2 size={18} color="#38bdf8" />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}

      {/* Top Telemetry KPI Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
        }}
      >
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#8b94a7', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em' }}>
              TOTAL DISBURSED
            </span>
            <span className="badge badge-emerald">Settled Outflow</span>
          </div>
          <div className="mono-figure" style={{ fontSize: '1.9rem', fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
            {formatCurrency(stats.totalDisbursedMinor)}
          </div>
          <p style={{ color: '#8b94a7', fontSize: '0.78rem', margin: 0 }}>
            Cumulative salary & payout disbursements
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#8b94a7', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em' }}>
              MONTHLY COMMITMENT
            </span>
            <span className="badge badge-cyan">Active Payroll</span>
          </div>
          <div className="mono-figure" style={{ fontSize: '1.9rem', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
            {formatCurrency(stats.monthlyCommitmentMinor)}
          </div>
          <p style={{ color: '#8b94a7', fontSize: '0.78rem', margin: 0 }}>
            {stats.activeStaff} active payees enrolled
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#8b94a7', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em' }}>
              ACTIVE PAYEES
            </span>
            <span className="badge badge-neutral">Roster</span>
          </div>
          <div className="mono-figure" style={{ fontSize: '1.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
            {stats.totalStaff} Staff
          </div>
          <p style={{ color: '#8b94a7', fontSize: '0.78rem', margin: 0 }}>
            Across {departmentsList.length} departments
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#8b94a7', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em' }}>
              PENDING APPROVAL
            </span>
            <span className={`badge ${stats.pendingRunsCount > 0 ? 'badge-amber' : 'badge-neutral'}`}>
              Maker-Checker
            </span>
          </div>
          <div className="mono-figure" style={{ fontSize: '1.9rem', fontWeight: 700, color: stats.pendingRunsCount > 0 ? '#fbbf24' : '#f8fafc', marginBottom: '6px' }}>
            {stats.pendingRunsCount} Runs
          </div>
          <p style={{ color: '#8b94a7', fontSize: '0.78rem', margin: 0 }}>
            Awaiting multi-signature authorization
          </p>
        </div>
      </section>

      {/* Controls Bar: Sub-Tabs & Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Navigation Sub-Tabs */}
        <div
          style={{
            display: 'flex',
            background: '#141720',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid #282d3d',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setSubTab('runs')}
            className={`btn ${subTab === 'runs' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.84rem', border: 'none' }}
          >
            <Calendar size={15} /> Payroll Runs ({runs.length})
          </button>
          <button
            onClick={() => setSubTab('directory')}
            className={`btn ${subTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.84rem', border: 'none' }}
          >
            <Users size={15} /> Staff Directory ({employees.length})
          </button>
          <button
            onClick={() => setSubTab('departments')}
            className={`btn ${subTab === 'departments' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.84rem', border: 'none' }}
          >
            <Building2 size={15} /> Departments ({departmentsList.length})
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsSingleModalOpen(true)}
            style={{ padding: '9px 16px', fontSize: '0.84rem' }}
            title="Disburse an immediate payout to a specific staff member or vendor"
          >
            <Send size={14} color="#38bdf8" />
            <span>Instant Payout</span>
          </button>

          {subTab === 'directory' ? (
            <button
              className="btn btn-primary"
              onClick={() => setIsAddEmployeeModalOpen(true)}
              style={{ padding: '9px 18px', fontSize: '0.84rem' }}
            >
              <Plus size={15} />
              <span>Enroll Payee</span>
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setIsRunModalOpen(true)}
              style={{ padding: '9px 18px', fontSize: '0.84rem' }}
            >
              <Zap size={15} />
              <span>Run Payroll</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: PAYROLL RUNS & DISBURSALS
          ========================================================================= */}
      {subTab === 'runs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search
                  size={15}
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                />
                <input
                  type="text"
                  placeholder="Search run #, period, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-obsidian"
                  style={{ paddingLeft: '38px', paddingRight: '12px', fontSize: '0.85rem' }}
                />
              </div>

              {departmentsList.length > 0 && (
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="select-obsidian"
                  style={{ width: 'auto', minWidth: '150px', fontSize: '0.85rem' }}
                >
                  <option value="all">All Departments ({departmentsList.length})</option>
                  {departmentsList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Presets Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#8b94a7' }}>Presets:</span>
              <button
                type="button"
                onClick={() => handleLoadTemplate('SCHOOL')}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
              >
                School
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('HOSPITAL')}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
              >
                Hospital
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('COMPANY')}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
              >
                Company
              </button>
            </div>
          </div>

          {/* Runs Table */}
          {filteredRuns.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '56px 20px',
                color: '#8b94a7',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                background: 'rgba(25, 28, 38, 0.4)',
              }}
            >
              <Banknote size={38} color="#38bdf8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                No Payroll Runs Created Yet
              </h3>
              <p style={{ fontSize: '0.84rem', maxWidth: '380px', margin: '0 auto 20px', color: '#8b94a7', lineHeight: 1.5 }}>
                Initiate a payroll cycle for your staff with institutional maker-checker sign-off and instant Kora disbursal.
              </p>
              <button className="btn btn-primary" onClick={() => setIsRunModalOpen(true)} style={{ fontSize: '0.84rem' }}>
                <Zap size={14} /> Create First Payroll Run
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <table className="table-obsidian">
                <thead>
                  <tr>
                    <th>RUN ID</th>
                    <th>PERIOD & COHORT</th>
                    <th>HEADCOUNT</th>
                    <th>CREATED</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>TOTAL DISBURSEMENT</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map((r) => (
                    <tr key={r.id}>
                      <td className="mono-figure" style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.84rem' }}>
                        {r.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.88rem' }}>{r.period}</div>
                        <span className="badge badge-neutral" style={{ fontSize: '0.68rem', marginTop: '3px' }}>
                          {r.department || 'All Departments'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>
                        {r.employeeCount} {r.employeeCount === 1 ? 'staff' : 'staff'}
                      </td>
                      <td style={{ color: '#8b94a7', fontSize: '0.8rem' }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        {r.status === 'COMPLETED' ? (
                          <span className="badge badge-emerald">PAID / SETTLED</span>
                        ) : r.status === 'APPROVED' ? (
                          <span className="badge badge-cyan">APPROVED</span>
                        ) : r.status === 'PENDING_APPROVAL' ? (
                          <span className="badge badge-amber">AWAITING APPROVAL</span>
                        ) : (
                          <span className="badge badge-neutral">DRAFT</span>
                        )}
                      </td>
                      <td className="mono-figure" style={{ textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>
                        {formatCurrency(r.amountMinor)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setActiveRunBreakdown(r)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                            title="View payroll run employee breakdown"
                          >
                            <FileSpreadsheet size={13} /> Breakdown
                          </button>

                          {r.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceRun(r.id)}
                              disabled={isActionBusy}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.74rem', borderColor: '#fbbf24', color: '#fbbf24' }}
                            >
                              Submit Approval
                            </button>
                          )}

                          {r.status === 'PENDING_APPROVAL' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceRun(r.id)}
                              disabled={isActionBusy}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.74rem', borderColor: '#38bdf8', color: '#38bdf8' }}
                            >
                              Approve Run
                            </button>
                          )}

                          {r.status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleDisburseRun(r.id)}
                              disabled={isActionBusy}
                              className="btn btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.74rem' }}
                            >
                              <Send size={12} /> Disburse
                            </button>
                          )}

                          {r.status === 'COMPLETED' && (
                            <span
                              style={{
                                color: '#34d399',
                                fontSize: '0.74rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600,
                              }}
                            >
                              <CheckCircle2 size={14} /> Settled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 2: STAFF & PAYEE DIRECTORY
          ========================================================================= */}
      {subTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Search bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
              <input
                type="text"
                placeholder="Search staff name, account, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-obsidian"
                style={{ paddingLeft: '38px', paddingRight: '12px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#8b94a7' }}>Department:</span>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="select-obsidian"
                style={{ width: 'auto', minWidth: '160px', fontSize: '0.85rem' }}
              >
                <option value="all">All Departments ({departmentsList.length})</option>
                {departmentsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Directory Table */}
          {filteredEmployees.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '56px 20px',
                color: '#8b94a7',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                background: 'rgba(25, 28, 38, 0.4)',
              }}
            >
              <Users size={38} color="#38bdf8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                No Payees Found
              </h3>
              <p style={{ fontSize: '0.84rem', maxWidth: '380px', margin: '0 auto 20px', color: '#8b94a7' }}>
                Enroll your first staff member or contractor with their NUBAN account details.
              </p>
              <button className="btn btn-primary" onClick={() => setIsAddEmployeeModalOpen(true)} style={{ fontSize: '0.84rem' }}>
                <Plus size={14} /> Enroll Payee
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <table className="table-obsidian">
                <thead>
                  <tr>
                    <th>PAYEE NAME</th>
                    <th>DEPARTMENT / COHORT</th>
                    <th>BANK & ACCOUNT NUMBER</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>MONTHLY SALARY</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{e.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#8b94a7', marginTop: '2px' }}>{e.role}</div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {e.department}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{e.bankName}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span className="mono-figure" style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
                            {e.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(e.accountNumber);
                              setCopiedAccount(e.id);
                              setTimeout(() => setCopiedAccount(null), 2000);
                            }}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                            title="Copy Account Number"
                          >
                            {copiedAccount === e.id ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-cyan">{e.status}</span>
                      </td>
                      <td className="mono-figure" style={{ textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>
                        {formatCurrency(e.salaryMinor)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSingleEmployeeId(e.id);
                              setSingleAmount((e.salaryMinor / 100).toString());
                              setSingleNarration(`Salary Payout: ${e.name}`);
                              setIsSingleModalOpen(true);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                            title="Disburse instant payout"
                          >
                            <Send size={12} color="#38bdf8" /> Pay Now
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(e.id, e.name)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '0.74rem', color: '#f87171' }}
                            title="Remove from roster"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 3: DEPARTMENTS & COMPENSATION
          ========================================================================= */}
      {subTab === 'departments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {departmentsList.map((dept) => {
              const deptStaff = employees.filter((e) => e.department === dept);
              const deptTotalSalary = deptStaff.reduce((s, e) => s + e.salaryMinor, 0);

              return (
                <div key={dept} className="glass-panel" style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{dept}</div>
                    <span className="badge badge-neutral">{deptStaff.length} Staff</span>
                  </div>
                  <div className="mono-figure" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                    {formatCurrency(deptTotalSalary)}
                  </div>
                  <p style={{ color: '#8b94a7', fontSize: '0.78rem', margin: '0 0 16px' }}>
                    Monthly department salary allocation
                  </p>
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
                    onClick={() => {
                      setNewRunDept(dept);
                      setIsRunModalOpen(true);
                    }}
                  >
                    <Zap size={13} color="#38bdf8" /> Run Department Payroll
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CREATE PAYROLL RUN
          ========================================================================= */}
      {isRunModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsRunModalOpen(false)}>
          <div
            className="modal-container"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-header-title">Initiate Payroll Run</h3>
                <p className="modal-header-subtitle">Create scheduled salary disbursement batch</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsRunModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRun} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body">
                <div>
                  <label className="label-obsidian">Period Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. October 2026 or Term 1 Final"
                    value={newRunPeriod}
                    onChange={(e) => setNewRunPeriod(e.target.value)}
                    className="input-obsidian"
                  />
                </div>

                <div>
                  <label className="label-obsidian">Target Department / Cohort</label>
                  <select
                    value={newRunDept}
                    onChange={(e) => setNewRunDept(e.target.value)}
                    className="select-obsidian"
                  >
                    <option value="all">All Departments (Entire Organization)</option>
                    {departmentsList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estimate box */}
                <div
                  style={{
                    background: '#191c26',
                    borderRadius: '12px',
                    border: '1px solid #282d3d',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem', color: '#8b94a7' }}>
                    <span>Eligible Payees:</span>
                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                      {employees.filter((e) => (newRunDept === 'all' || e.department === newRunDept) && e.status === 'ACTIVE').length} staff
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#8b94a7' }}>
                    <span>Estimated Total Disbursement:</span>
                    <span className="mono-figure" style={{ color: '#38bdf8', fontWeight: 700 }}>
                      {formatCurrency(
                        employees
                          .filter((e) => (newRunDept === 'all' || e.department === newRunDept) && e.status === 'ACTIVE')
                          .reduce((s, e) => s + e.salaryMinor, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRunModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isActionBusy}>
                  {isActionBusy ? 'Creating...' : 'Create Draft Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: INSTANT SINGLE PAYOUT
          ========================================================================= */}
      {isSingleModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSingleModalOpen(false)}>
          <div
            className="modal-container"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-header-title">Instant Payout / Disbursement</h3>
                <p className="modal-header-subtitle">Disburse funds directly to payee bank account</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsSingleModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSingleDisburse} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body">
                <div>
                  <label className="label-obsidian">Select Payee</label>
                  <select
                    required
                    value={singleEmployeeId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      setSingleEmployeeId(empId);
                      const selected = employees.find((emp) => emp.id === empId);
                      if (selected) {
                        setSingleAmount((selected.salaryMinor / 100).toString());
                        setSingleNarration(`Salary Payout: ${selected.name}`);
                      }
                    }}
                    className="select-obsidian"
                  >
                    <option value="">-- Choose enrolled employee / payee --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.department} - {e.bankName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-obsidian">Disbursement Amount ({baseCurrency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 350000.00"
                    value={singleAmount}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    className="input-obsidian mono-figure"
                  />
                </div>

                <div>
                  <label className="label-obsidian">Narration / Payment Purpose</label>
                  <input
                    type="text"
                    placeholder="e.g. October Salary or Bonus"
                    value={singleNarration}
                    onChange={(e) => setSingleNarration(e.target.value)}
                    className="input-obsidian"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSingleModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isActionBusy}>
                  {isActionBusy ? 'Disbursing...' : 'Disburse Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ENROLL NEW PAYEE
          ========================================================================= */}
      {isAddEmployeeModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddEmployeeModalOpen(false)}>
          <div
            className="modal-container"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-header-title">Enroll New Payee / Staff</h3>
                <p className="modal-header-subtitle">Register staff details and verified NUBAN bank account</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddEmployeeModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label-obsidian">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adaobi Okonkwo"
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      className="input-obsidian"
                    />
                  </div>
                  <div>
                    <label className="label-obsidian">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. adaobi@school.edu.ng"
                      value={newEmpEmail}
                      onChange={(e) => setNewEmpEmail(e.target.value)}
                      className="input-obsidian"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label-obsidian">Department</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Academic Faculty"
                      value={newEmpDept}
                      onChange={(e) => setNewEmpDept(e.target.value)}
                      className="input-obsidian"
                    />
                  </div>
                  <div>
                    <label className="label-obsidian">Role / Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Lecturer"
                      value={newEmpRole}
                      onChange={(e) => setNewEmpRole(e.target.value)}
                      className="input-obsidian"
                    />
                  </div>
                </div>

                <div>
                  <label className="label-obsidian">Bank Name</label>
                  <select
                    value={newEmpBankCode}
                    onChange={(e) => setNewEmpBankCode(e.target.value)}
                    className="select-obsidian"
                  >
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label-obsidian">NUBAN Account # (10 digits)</label>
                    <input
                      type="text"
                      maxLength={10}
                      required
                      placeholder="0123456789"
                      value={newEmpAccountNum}
                      onChange={(e) => setNewEmpAccountNum(e.target.value.replace(/\D/g, ''))}
                      className="input-obsidian mono-figure"
                    />
                  </div>
                  <div>
                    <label className="label-obsidian">Monthly Salary ({baseCurrency})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="350000.00"
                      value={newEmpSalary}
                      onChange={(e) => setNewEmpSalary(e.target.value)}
                      className="input-obsidian mono-figure"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddEmployeeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isActionBusy}>
                  {isActionBusy ? 'Enrolling...' : 'Enroll Payee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: RUN BREAKDOWN
          ========================================================================= */}
      {activeRunBreakdown && (
        <div className="modal-backdrop" onClick={() => setActiveRunBreakdown(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '680px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-header-title">{activeRunBreakdown.period} • Roster Breakdown</h3>
                <p className="modal-header-subtitle">
                  {activeRunBreakdown.employeeCount} payees • Total {formatCurrency(activeRunBreakdown.amountMinor)}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveRunBreakdown(null)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <table className="table-obsidian">
                  <thead>
                    <tr>
                      <th>EMPLOYEE</th>
                      <th>DEPARTMENT</th>
                      <th>DESTINATION</th>
                      <th style={{ textAlign: 'right' }}>NET SALARY</th>
                      <th style={{ textAlign: 'center' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRunBreakdown.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{line.employeeName}</td>
                        <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{line.department}</td>
                        <td style={{ fontSize: '0.78rem', color: '#8b94a7' }}>
                          {line.bankName} ({line.accountNumber})
                        </td>
                        <td className="mono-figure" style={{ textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>
                          {formatCurrency(line.amountMinor)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${line.status === 'DISBURSED' ? 'badge-emerald' : 'badge-neutral'}`}>
                            {line.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveRunBreakdown(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

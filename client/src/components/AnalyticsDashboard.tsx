import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Receipt,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Filter,
  Layers,
  Building2,
  Calendar,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  MailCheck,
  ShieldAlert,
} from 'lucide-react';

export interface JournalEntryLine {
  id: string;
  description: string;
  sourceType: string;
  debitAccount: string;
  creditAccount: string;
  amountMinor: number;
  postedAt: string;
}

export interface BillItemLine {
  itemId?: string;
  description: string;
  amountMinor: number;
}

export interface Bill {
  id: string;
  orgId: string;
  token: string;
  payerId?: string;
  payerName: string;
  payerEmail?: string;
  groupId?: string;
  groupName?: string;
  items: BillItemLine[];
  totalAmountMinor: number;
  currency: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  createdAt: string;
  paidAt?: string;
}

export interface PayerGroup {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

export interface BillingItem {
  id: string;
  name: string;
  category: string;
  defaultAmountMinor: number;
}

export interface Payer {
  id: string;
  name: string;
  identifier: string;
  groupId: string;
  email?: string;
  phone?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  salaryMinor: number;
  currency: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  joinedAt?: string;
}

export interface PayrollRun {
  id: string;
  period: string;
  department: string;
  employeeCount: number;
  amountMinor: number;
  currency: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  completedAt?: string;
}

interface AnalyticsDashboardProps {
  baseCurrency: string;
  orgName: string;
  onNavigateToTab?: (tab: 'overview' | 'transactions' | 'billing' | 'payroll') => void;
}

// Visual Theme Palette
const PALETTE = {
  cyan: '#38bdf8',
  emerald: '#10b981',
  violet: '#a855f7',
  amber: '#f59e0b',
  rose: '#f43f5e',
  indigo: '#6366f1',
  blue: '#3b82f6',
  slate: '#94a3b8',
  darkBg: '#141720',
  gridLine: 'rgba(255, 255, 255, 0.06)',
};

const PIE_COLORS = [
  '#38bdf8',
  '#10b981',
  '#a855f7',
  '#f59e0b',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  baseCurrency,
  orgName,
  onNavigateToTab,
}) => {
  // Timeframe & View Filters
  const [timeframe, setTimeframe] = useState<'30D' | '90D' | 'YTD' | 'ALL'>('ALL');
  const [selectedCohortFilter, setSelectedCohortFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Cross-App State
  const [ledgerEntries, setLedgerEntries] = useState<JournalEntryLine[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [groups, setGroups] = useState<PayerGroup[]>([]);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);

  const currencySymbol =
    baseCurrency === 'USD' ? '$' : baseCurrency === 'GBP' ? '£' : baseCurrency === 'EUR' ? '€' : '₦';

  const formatCurrency = (minor: number | undefined | null) => {
    const num = Number(minor);
    const safeMinor = Number.isFinite(num) ? num : 0;
    const isNeg = safeMinor < 0;
    const abs = Math.abs(safeMinor) / 100;
    return `${isNeg ? '-' : ''}${currencySymbol}${abs.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatCurrencyShort = (minor: number | undefined | null) => {
    const num = Number(minor);
    const safeMinor = Number.isFinite(num) ? num : 0;
    const abs = Math.abs(safeMinor) / 100;
    if (abs >= 1_000_000) {
      return `${currencySymbol}${(abs / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      return `${currencySymbol}${(abs / 1_000).toFixed(1)}k`;
    }
    return `${currencySymbol}${abs.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Fetch data from across the entire app
  const fetchAllAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const headers = {
        Authorization: 'Bearer clerk_token',
        'x-org-id': orgName,
      };

      const [ledgerRes, billsRes, billingConfigRes, payrollConfigRes] = await Promise.all([
        fetch('/api/v1/ledger/entries', { headers }),
        fetch('/api/v1/bills', { headers }),
        fetch('/api/v1/billing/config', { headers }),
        fetch('/api/v1/payroll/config', { headers }),
      ]);

      if (ledgerRes.ok) {
        const lData = await ledgerRes.json();
        setLedgerEntries(lData.entries || []);
      }
      if (billsRes.ok) {
        const bData = await billsRes.json();
        setBills(bData.bills || []);
      }
      if (billingConfigRes.ok) {
        const cData = await billingConfigRes.json();
        setGroups(cData.groups || []);
        setItems(cData.items || []);
        setPayers(cData.payers || []);
      }
      if (payrollConfigRes.ok) {
        const pData = await payrollConfigRes.json();
        setEmployees(pData.employees || []);
        setPayrollRuns(pData.runs || []);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('[Analytics] Failed to fetch aggregate data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalyticsData();
  }, [orgName]);

  // Date filtering helper
  const isWithinTimeframe = (dateString?: string) => {
    if (!dateString) return true;
    if (timeframe === 'ALL') return true;

    const targetDate = new Date(dateString).getTime();
    const now = Date.now();

    if (timeframe === '30D') return now - targetDate <= 30 * 86400000;
    if (timeframe === '90D') return now - targetDate <= 90 * 86400000;
    if (timeframe === 'YTD') {
      const currentYearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
      return targetDate >= currentYearStart;
    }
    return true;
  };

  // Filtered datasets
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((e) => isWithinTimeframe(e.postedAt));
  }, [ledgerEntries, timeframe]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const timeMatch = isWithinTimeframe(b.createdAt);
      const cohortMatch = selectedCohortFilter === 'all' || b.groupId === selectedCohortFilter;
      return timeMatch && cohortMatch;
    });
  }, [bills, timeframe, selectedCohortFilter]);

  // =========================================================================
  // CORE METRIC CALCULATIONS
  // =========================================================================
  const totalInflowMinor = useMemo(() => {
    return filteredEntries
      .filter((e) => e.debitAccount === 'KORA_WALLET' || e.sourceType === 'DEPOSIT' || e.sourceType === 'BILL_PAY')
      .reduce((sum, e) => sum + e.amountMinor, 0);
  }, [filteredEntries]);

  const totalOutflowMinor = useMemo(() => {
    return filteredEntries
      .filter(
        (e) =>
          e.creditAccount === 'KORA_WALLET' ||
          e.sourceType === 'PAYROLL' ||
          e.sourceType === 'TRANSFER' ||
          e.sourceType === 'OPERATIONS'
      )
      .reduce((sum, e) => sum + e.amountMinor, 0);
  }, [filteredEntries]);

  const netLiquidityMinor = totalInflowMinor - totalOutflowMinor;

  // Billing Metrics
  const totalInvoicedMinor = useMemo(() => {
    return filteredBills.reduce((sum, b) => sum + (b.totalAmountMinor || 0), 0);
  }, [filteredBills]);

  const totalCollectedMinor = useMemo(() => {
    return filteredBills
      .filter((b) => b.status === 'PAID')
      .reduce((sum, b) => sum + (b.totalAmountMinor || 0), 0);
  }, [filteredBills]);

  const totalOutstandingMinor = totalInvoicedMinor - totalCollectedMinor;

  const collectionRate = useMemo(() => {
    if (totalInvoicedMinor === 0) return 0;
    return Math.min(100, Math.round((totalCollectedMinor / totalInvoicedMinor) * 100));
  }, [totalInvoicedMinor, totalCollectedMinor]);

  const overdueBills = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    return filteredBills.filter((b) => b.status === 'OVERDUE' || (b.status === 'ISSUED' && b.dueDate < now));
  }, [filteredBills]);

  const totalOverdueMinor = overdueBills.reduce((sum, b) => sum + (b.totalAmountMinor || 0), 0);

  // Payroll Metrics
  const monthlyPayrollCommitmentMinor = useMemo(() => {
    return employees
      .filter((e) => e.status === 'ACTIVE')
      .reduce((sum, e) => sum + e.salaryMinor, 0);
  }, [employees]);

  const activeStaffCount = employees.filter((e) => e.status === 'ACTIVE').length;

  // Payer Digital Penetration (Korapay readiness)
  const payersWithEmailCount = payers.filter((p) => p.email && p.email.includes('@')).length;
  const payerEmailPenetrationRate =
    payers.length > 0 ? Math.round((payersWithEmailCount / payers.length) * 100) : 0;

  // Financial Runway Estimate
  const estimatedMonthsRunway = useMemo(() => {
    const monthlyBurn = monthlyPayrollCommitmentMinor + (totalOutflowMinor > 0 ? totalOutflowMinor / 3 : 0);
    if (monthlyBurn <= 0) return 12;
    const months = (Math.max(0, netLiquidityMinor) / monthlyBurn);
    return Math.max(0.1, Number(months.toFixed(1)));
  }, [netLiquidityMinor, monthlyPayrollCommitmentMinor, totalOutflowMinor]);

  // =========================================================================
  // CHART DATA 1: CASH FLOW & LIQUIDITY TRAJECTORY (Recharts AreaChart)
  // =========================================================================
  const cashFlowTimelineData = useMemo(() => {
    if (filteredEntries.length === 0) {
      // Provide clean default timeline
      return [
        { date: 'Initial', Inflow: 0, Outflow: 0, NetPosition: 0 },
        { date: 'Current', Inflow: totalInflowMinor / 100, Outflow: totalOutflowMinor / 100, NetPosition: netLiquidityMinor / 100 },
      ];
    }

    // Sort entries chronologically
    const sorted = [...filteredEntries].sort(
      (a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime()
    );

    let runningInflow = 0;
    let runningOutflow = 0;
    let runningBalance = 0;

    const dataPoints: Array<{
      date: string;
      Inflow: number;
      Outflow: number;
      NetPosition: number;
      label: string;
    }> = [];

    // Group or synthesize points
    sorted.forEach((e, idx) => {
      const isInflow =
        e.debitAccount === 'KORA_WALLET' || e.sourceType === 'DEPOSIT' || e.sourceType === 'BILL_PAY';
      const isOutflow =
        e.creditAccount === 'KORA_WALLET' ||
        e.sourceType === 'PAYROLL' ||
        e.sourceType === 'TRANSFER' ||
        e.sourceType === 'OPERATIONS';

      if (isInflow) runningInflow += e.amountMinor;
      if (isOutflow) runningOutflow += e.amountMinor;
      runningBalance = runningInflow - runningOutflow;

      const dateObj = new Date(e.postedAt);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      dataPoints.push({
        date: formattedDate || `T-${idx + 1}`,
        Inflow: Math.round(runningInflow / 100),
        Outflow: Math.round(runningOutflow / 100),
        NetPosition: Math.round(runningBalance / 100),
        label: e.description,
      });
    });

    return dataPoints;
  }, [filteredEntries, totalInflowMinor, totalOutflowMinor, netLiquidityMinor]);

  // =========================================================================
  // CHART DATA 2: COHORT REVENUE & RECEIVABLES MATRIX (Recharts BarChart)
  // =========================================================================
  const cohortMatrixData = useMemo<
    Array<{
      name: string;
      fullName: string;
      Collected: number;
      Outstanding: number;
      Total: number;
      studentCount: number;
    }>
  >(() => {
    if (groups.length === 0) {
      return [];
    }

    return groups.map((g) => {
      const cohortBills = filteredBills.filter((b) => b.groupId === g.id);
      const collected = cohortBills
        .filter((b) => b.status === 'PAID')
        .reduce((sum, b) => sum + (b.totalAmountMinor || 0), 0);
      const total = cohortBills.reduce((sum, b) => sum + (b.totalAmountMinor || 0), 0);
      const outstanding = Math.max(0, total - collected);
      const studentCount = payers.filter((p) => p.groupId === g.id).length;

      return {
        name: g.code || g.name,
        fullName: g.name,
        Collected: Math.round(collected / 100),
        Outstanding: Math.round(outstanding / 100),
        Total: Math.round(total / 100),
        studentCount,
      };
    });
  }, [groups, filteredBills, payers]);

  // =========================================================================
  // CHART DATA 3: REVENUE CATEGORY COMPOSITION (Recharts PieChart)
  // =========================================================================
  const revenueCategoryData = useMemo<
    Array<{
      name: string;
      value: number;
      percentage: number;
      color: string;
    }>
  >(() => {
    const categoryTotals: Record<string, number> = {};

    filteredBills.forEach((b) => {
      if (b.items && Array.isArray(b.items)) {
        b.items.forEach((item) => {
          // Look up category in catalog items or derive
          const catalogItem = items.find((it) => it.id === item.itemId);
          const catName = catalogItem?.category || 'General Fees';
          categoryTotals[catName] = (categoryTotals[catName] || 0) + (Number(item.amountMinor) || 0);
        });
      }
    });

    const categories = Object.keys(categoryTotals);
    if (categories.length === 0) {
      return [];
    }

    const totalVal = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return categories.map((cat, idx) => ({
      name: cat,
      value: Math.round(categoryTotals[cat] / 100),
      percentage: totalVal > 0 ? Math.round((categoryTotals[cat] / totalVal) * 100) : 0,
      color: PIE_COLORS[idx % PIE_COLORS.length],
    }));
  }, [filteredBills, items]);

  // =========================================================================
  // CHART DATA 4: DEPARTMENTAL PAYROLL BREAKDOWN (Horizontal BarChart)
  // =========================================================================
  const departmentalPayrollData = useMemo<
    Array<{
      department: string;
      MonthlySalary: number;
      StaffCount: number;
      avgSalary: number;
    }>
  >(() => {
    const deptMap: Record<string, { totalSalaryMinor: number; staffCount: number }> = {};

    employees.forEach((emp) => {
      const dept = emp.department || 'Administration';
      if (!deptMap[dept]) {
        deptMap[dept] = { totalSalaryMinor: 0, staffCount: 0 };
      }
      deptMap[dept].totalSalaryMinor += Number(emp.salaryMinor) || 0;
      deptMap[dept].staffCount += 1;
    });

    const keys = Object.keys(deptMap);
    if (keys.length === 0) {
      return [];
    }

    return keys.map((dept) => ({
      department: dept,
      MonthlySalary: Math.round(deptMap[dept].totalSalaryMinor / 100),
      StaffCount: deptMap[dept].staffCount,
      avgSalary:
        deptMap[dept].staffCount > 0
          ? Math.round(deptMap[dept].totalSalaryMinor / deptMap[dept].staffCount / 100)
          : 0,
    }));
  }, [employees]);

  // =========================================================================
  // CHART DATA 5: INVOICE AGING & STATUS BREAKDOWN
  // =========================================================================
  const invoiceAgingData = useMemo(() => {
    const now = new Date();
    let paidAmount = 0;
    let dueWithin7 = 0;
    let due8to14 = 0;
    let overdueAmount = 0;

    filteredBills.forEach((b) => {
      const amount = b.totalAmountMinor / 100;
      if (b.status === 'PAID') {
        paidAmount += amount;
      } else {
        const dueDate = new Date(b.dueDate);
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

        if (diffDays < 0 || b.status === 'OVERDUE') {
          overdueAmount += amount;
        } else if (diffDays <= 7) {
          dueWithin7 += amount;
        } else {
          due8to14 += amount;
        }
      }
    });

    return [
      { name: 'Settled / Paid', amount: Math.round(paidAmount), color: PALETTE.emerald },
      { name: 'Due (0-7 Days)', amount: Math.round(dueWithin7), color: PALETTE.cyan },
      { name: 'Due (8-14 Days)', amount: Math.round(due8to14), color: PALETTE.amber },
      { name: 'Overdue (>14d)', amount: Math.round(overdueAmount), color: PALETTE.rose },
    ];
  }, [filteredBills]);

  // =========================================================================
  // EXPORT COMPLETE ANALYTICS REPORT (.xlsx)
  // =========================================================================
  const handleExportAnalyticsExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Executive KPI Summary
      const summaryRows = [
        { Metric: 'Organization Name', Value: orgName },
        { Metric: 'Base Currency', Value: baseCurrency },
        { Metric: 'Report Date', Value: new Date().toLocaleDateString() },
        { Metric: 'Total Treasury Inflows', Value: (totalInflowMinor / 100).toFixed(2) },
        { Metric: 'Total Treasury Outflows', Value: (totalOutflowMinor / 100).toFixed(2) },
        { Metric: 'Net Treasury Position', Value: (netLiquidityMinor / 100).toFixed(2) },
        { Metric: 'Total Invoiced Volume', Value: (totalInvoicedMinor / 100).toFixed(2) },
        { Metric: 'Total Settled Collections', Value: (totalCollectedMinor / 100).toFixed(2) },
        { Metric: 'Outstanding Receivables', Value: (totalOutstandingMinor / 100).toFixed(2) },
        { Metric: 'Collection Efficiency Rate', Value: `${collectionRate}%` },
        { Metric: 'Monthly Payroll Commitment', Value: (monthlyPayrollCommitmentMinor / 100).toFixed(2) },
        { Metric: 'Active Staff Headcount', Value: activeStaffCount },
        { Metric: 'Total Enrolled Payers', Value: payers.length },
        { Metric: 'Payers Ready for Korapay Checkout', Value: `${payerEmailPenetrationRate}% (${payersWithEmailCount}/${payers.length})` },
        { Metric: 'Estimated Financial Runway (Months)', Value: estimatedMonthsRunway },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

      // Sheet 2: Cohort Matrix
      const cohortRows = cohortMatrixData.map((c) => ({
        'Cohort Name': c.fullName || c.name,
        'Settled Collections': c.Collected,
        'Outstanding Receivables': c.Outstanding,
        'Total Invoiced': c.Total,
        'Enrolled Students/Payers': c.studentCount,
      }));
      const cohortSheet = XLSX.utils.json_to_sheet(cohortRows);
      XLSX.utils.book_append_sheet(workbook, cohortSheet, 'Cohort Breakdown');

      // Sheet 3: Departmental Payroll
      const payrollRows = departmentalPayrollData.map((d) => ({
        Department: d.department,
        'Monthly Compensation': d.MonthlySalary,
        'Staff Headcount': d.StaffCount,
        'Average Monthly Salary': d.avgSalary,
      }));
      const payrollSheet = XLSX.utils.json_to_sheet(payrollRows);
      XLSX.utils.book_append_sheet(workbook, payrollSheet, 'Payroll by Dept');

      // Sheet 4: Invoice Records
      const invoiceRows = filteredBills.map((b) => ({
        'Invoice ID': b.id,
        'Payer Name': b.payerName,
        'Payer Email': b.payerEmail || 'N/A',
        Cohort: b.groupName || 'General',
        'Amount Due': (b.totalAmountMinor / 100).toFixed(2),
        Status: b.status,
        'Due Date': b.dueDate,
        'Created Date': b.createdAt?.split('T')[0] || '',
        'Paid Date': b.paidAt ? b.paidAt.split('T')[0] : 'Unpaid',
      }));
      const invoiceSheet = XLSX.utils.json_to_sheet(invoiceRows);
      XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'Invoice Register');

      // Download
      XLSX.writeFile(
        workbook,
        `${orgName.replace(/\s+/g, '_')}_Financial_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`
      );
    } catch (err: any) {
      console.error('[Analytics] Failed to export excel report:', err);
    }
  };

  // Custom Dark Obsidian Tooltip for Recharts
  const CustomRechartsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: '#141720',
            border: '1px solid #282d3d',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>{label}</div>
          {payload.map((entry: any, index: number) => (
            <div
              key={`item-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                color: entry.color || '#f8fafc',
                margin: '3px 0',
              }}
            >
              <span style={{ color: '#cbd5e1' }}>{entry.name}:</span>
              <span className="mono-figure" style={{ fontWeight: 700 }}>
                {currencySymbol}
                {Number(entry.value).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      {/* =========================================================================
          TOP BAR & ANALYTICS HEADER
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span
              className="badge badge-cyan"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px' }}
            >
              <BarChart3 size={13} /> Institutional Analytics
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              Refreshed {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Financial & Operational Intelligence
          </h1>
          <p style={{ color: '#8b94a7', fontSize: '0.84rem', margin: '4px 0 0' }}>
            Synthesized metrics cross-referenced in real-time across Treasury Ledger, Receivables Billing, and Staff Payroll.
          </p>
        </div>

        {/* Global Controls & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Timeframe Selector */}
          <div
            style={{
              display: 'flex',
              background: '#141720',
              border: '1px solid #282d3d',
              borderRadius: '10px',
              padding: '3px',
              gap: '2px',
            }}
          >
            {(['30D', '90D', 'YTD', 'ALL'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                style={{
                  background: timeframe === tf ? '#0284c7' : 'transparent',
                  color: timeframe === tf ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Cohort / Group Filter */}
          {groups.length > 0 && (
            <select
              className="select-obsidian"
              style={{ width: 'auto', minWidth: '130px', padding: '6px 12px', fontSize: '0.8rem' }}
              value={selectedCohortFilter}
              onChange={(e) => setSelectedCohortFilter(e.target.value)}
            >
              <option value="all">All Cohorts</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchAllAnalyticsData}
            disabled={isLoading}
            style={{ padding: '7px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh All Analytics Data"
          >
            <RefreshCw size={13} className={isLoading ? 'spinner' : ''} />
            <span>Sync</span>
          </button>

          {/* Export Report to Excel */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportAnalyticsExcel}
            style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={13} />
            <span>Export (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          EXECUTIVE KPI CARDS (5 Core Institutional Indicators)
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
        }}
      >
        {/* KPI 1: Net Liquidity Position */}
        <div
          className="glass-panel"
          style={{ padding: '18px 20px', background: '#141720', border: '1px solid #282d3d' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#8b94a7', fontWeight: 600 }}>Net Cash Position</span>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={16} />
            </div>
          </div>
          <div className="mono-figure" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            {formatCurrency(netLiquidityMinor)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}>
            <span style={{ color: totalInflowMinor >= totalOutflowMinor ? '#10b981' : '#f43f5e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              {totalInflowMinor >= totalOutflowMinor ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {totalOutflowMinor > 0 ? `${((netLiquidityMinor / totalOutflowMinor) * 100).toFixed(0)}% margin` : 'Solvent'}
            </span>
            <span style={{ color: '#64748b' }}>vs operational burn</span>
          </div>
        </div>

        {/* KPI 2: Collection Efficiency */}
        <div
          className="glass-panel"
          style={{ padding: '18px 20px', background: '#141720', border: '1px solid #282d3d' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#8b94a7', fontWeight: 600 }}>Collection Efficiency</span>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mono-figure" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
            {collectionRate}%
          </div>
          {/* Visual Mini Progress Bar */}
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', margin: '6px 0 4px' }}>
            <div style={{ width: `${collectionRate}%`, height: '100%', background: '#10b981', borderRadius: '999px' }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: '#8b94a7' }}>
            {formatCurrencyShort(totalCollectedMinor)} collected of {formatCurrencyShort(totalInvoicedMinor)}
          </div>
        </div>

        {/* KPI 3: Outstanding Receivables */}
        <div
          className="glass-panel"
          style={{ padding: '18px 20px', background: '#141720', border: '1px solid #282d3d' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#8b94a7', fontWeight: 600 }}>Outstanding Invoices</span>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                background: 'rgba(244, 63, 94, 0.1)',
                color: '#f43f5e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={16} />
            </div>
          </div>
          <div className="mono-figure" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            {formatCurrency(totalOutstandingMinor)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}>
            {overdueBills.length > 0 ? (
              <span style={{ color: '#f43f5e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <AlertCircle size={12} /> {overdueBills.length} Overdue
              </span>
            ) : (
              <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <CheckCircle2 size={12} /> Zero Overdue
              </span>
            )}
            <span style={{ color: '#64748b' }}>({formatCurrencyShort(totalOverdueMinor)} at risk)</span>
          </div>
        </div>

        {/* KPI 4: Monthly Payroll Obligation */}
        <div
          className="glass-panel"
          style={{ padding: '18px 20px', background: '#141720', border: '1px solid #282d3d' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#8b94a7', fontWeight: 600 }}>Monthly Payroll</span>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.1)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={16} />
            </div>
          </div>
          <div className="mono-figure" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            {formatCurrency(monthlyPayrollCommitmentMinor)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#8b94a7' }}>
            <span style={{ color: '#a855f7', fontWeight: 600 }}>{activeStaffCount} active staff</span>
            <span>across {departmentalPayrollData.length} depts</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CHART SECTION 1: CASH FLOW & LIQUIDITY TRAJECTORY (Full Width AreaChart)
          ========================================================================= */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          background: '#141720',
          border: '1px solid #282d3d',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} style={{ color: '#38bdf8' }} /> Cumulative Cash Trajectory & Net Position
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#8b94a7', margin: '3px 0 0' }}>
              Inflows (invoice payments & wallet deposits) vs Outflows (payroll disbursements & transfers) over time
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.76rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#10b981' }} />
              <span style={{ color: '#cbd5e1' }}>Inflows (Deposits/Bills)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#f43f5e' }} />
              <span style={{ color: '#cbd5e1' }}>Outflows (Payroll/Payouts)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 3, borderRadius: '2px', background: '#38bdf8' }} />
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>Net Position</span>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlowTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.gridLine} vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip content={<CustomRechartsTooltip />} />
              <Area
                type="monotone"
                dataKey="Inflow"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#inflowGrad)"
                name="Cumulative Inflow"
              />
              <Area
                type="monotone"
                dataKey="Outflow"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#outflowGrad)"
                name="Cumulative Outflow"
              />
              <Line
                type="monotone"
                dataKey="NetPosition"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#38bdf8' }}
                name="Net Balance"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =========================================================================
          CHART SECTION 2: COHORT PERFORMANCE & REVENUE MATRIX (2-Column Grid)
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
        {/* Cohort Receivables vs Collections BarChart */}
        <div
          className="glass-panel"
          style={{ padding: '22px', background: '#141720', border: '1px solid #282d3d', borderRadius: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Cohort Collection vs Outstanding Matrix
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#8b94a7', margin: '2px 0 0' }}>
                Settled vs pending invoice collections partitioned by grade/cohort
              </p>
            </div>
            <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
              {cohortMatrixData.length} Cohorts
            </span>
          </div>

          {cohortMatrixData.length === 0 ? (
            <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.84rem', gap: '8px', border: '1px dashed #282d3d', borderRadius: '12px' }}>
              <Layers size={28} style={{ color: '#38bdf8', opacity: 0.5 }} />
              <div>No cohorts registered yet in the database.</div>
              <div style={{ fontSize: '0.75rem', color: '#475569' }}>Create cohorts in Billing & Invoices to track performance.</div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortMatrixData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.gridLine} vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomRechartsTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '0.76rem', paddingTop: '8px' }}
                    iconSize={10}
                    formatter={(value) => <span style={{ color: '#cbd5e1' }}>{value}</span>}
                  />
                  <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} name="Settled Fees" />
                  <Bar dataKey="Outstanding" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Pending Balance" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Revenue Stream Category Breakdown PieChart */}
        <div
          className="glass-panel"
          style={{ padding: '22px', background: '#141720', border: '1px solid #282d3d', borderRadius: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Fee Catalog Category Distribution
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#8b94a7', margin: '2px 0 0' }}>
                Revenue stream apportionment by institutional fee type
              </p>
            </div>
            <PieIcon size={16} style={{ color: '#a855f7' }} />
          </div>

          {revenueCategoryData.length === 0 ? (
            <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.84rem', gap: '8px', border: '1px dashed #282d3d', borderRadius: '12px' }}>
              <PieIcon size={28} style={{ color: '#a855f7', opacity: 0.5 }} />
              <div>No fee catalog categories in database yet.</div>
              <div style={{ fontSize: '0.75rem', color: '#475569' }}>Add itemized fee items in Billing to see revenue apportionment.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', height: 260 }}>
              <div style={{ flex: 1, height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {revenueCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomRechartsTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend List */}
              <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                {revenueCategoryData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color || PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </span>
                    </div>
                    <span className="mono-figure" style={{ color: '#f8fafc', fontWeight: 600 }}>
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          CHART SECTION 3: DEPARTMENTAL PAYROLL & INVOICE AGING (2-Column Grid)
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
        {/* Departmental Payroll Compensation BarChart */}
        <div
          className="glass-panel"
          style={{ padding: '22px', background: '#141720', border: '1px solid #282d3d', borderRadius: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Departmental Payroll Compensation
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#8b94a7', margin: '2px 0 0' }}>
                Monthly salary liabilities categorized across institutional divisions
              </p>
            </div>
            <Users size={16} style={{ color: '#a855f7' }} />
          </div>

          {departmentalPayrollData.length === 0 ? (
            <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.84rem', gap: '8px', border: '1px dashed #282d3d', borderRadius: '12px' }}>
              <Users size={28} style={{ color: '#a855f7', opacity: 0.5 }} />
              <div>No staff employees registered in payroll database yet.</div>
              <div style={{ fontSize: '0.75rem', color: '#475569' }}>Enroll staff members in Payroll to view departmental liabilities.</div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentalPayrollData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 35, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.gridLine} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <YAxis dataKey="department" type="category" stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomRechartsTooltip />} />
                  <Bar
                    dataKey="MonthlySalary"
                    fill="#a855f7"
                    radius={[0, 4, 4, 0]}
                    name="Monthly Obligation"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Invoice Aging & Settlement Velocity */}
        <div
          className="glass-panel"
          style={{ padding: '22px', background: '#141720', border: '1px solid #282d3d', borderRadius: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Invoice Aging & Risk Distribution
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#8b94a7', margin: '2px 0 0' }}>
                Distribution of invoiced receivables by maturity and payment status
              </p>
            </div>
            <Clock size={16} style={{ color: '#38bdf8' }} />
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invoiceAgingData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.gridLine} vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomRechartsTooltip />} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} name="Receivable Amount">
                  {invoiceAgingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* =========================================================================
          INSTITUTIONAL SOLVENCY & STRATEGIC RECOMMENDATIONS
          ========================================================================= */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          background: '#141720',
          border: '1px solid #282d3d',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles size={16} style={{ color: '#38bdf8' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Institutional Solvency & Operating Runway Analysis
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {/* Health Indicator 1: Operating Runway */}
          <div
            style={{
              background: '#0d1017',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '0.76rem', color: '#8b94a7', marginBottom: '4px' }}>Estimated Cash Runway</div>
            <div className="mono-figure" style={{ fontSize: '1.6rem', fontWeight: 800, color: estimatedMonthsRunway >= 3 ? '#10b981' : '#f43f5e' }}>
              {estimatedMonthsRunway} Months
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
              Based on available treasury liquidity of {formatCurrencyShort(netLiquidityMinor)} versus monthly payroll obligations.
            </p>
          </div>

          {/* Health Indicator 2: Inflow Coverage Ratio */}
          <div
            style={{
              background: '#0d1017',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '0.76rem', color: '#8b94a7', marginBottom: '4px' }}>Inflow / Obligation Ratio</div>
            <div className="mono-figure" style={{ fontSize: '1.6rem', fontWeight: 800, color: totalInflowMinor >= monthlyPayrollCommitmentMinor ? '#38bdf8' : '#f59e0b' }}>
              {monthlyPayrollCommitmentMinor > 0 ? (totalInflowMinor / monthlyPayrollCommitmentMinor).toFixed(1) : '1.0'}x
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
              Collections adequately cover monthly salary disbursements by a factor of{' '}
              {monthlyPayrollCommitmentMinor > 0 ? (totalInflowMinor / monthlyPayrollCommitmentMinor).toFixed(1) : '1.0'}.
            </p>
          </div>

          {/* Health Indicator 3: Korapay Digital Collection Health */}
          <div
            style={{
              background: '#0d1017',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '0.76rem', color: '#8b94a7', marginBottom: '4px' }}>Digital Payment Conversion</div>
            <div className="mono-figure" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              {filteredBills.filter((b) => b.status === 'PAID').length} Paid / {filteredBills.length} Bills
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
              Interactive online invoices dispatched with automated double-entry ledger settlement on payment receipt.
            </p>
          </div>
        </div>

        {/* Actionable recommendations row */}
        {overdueBills.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={18} style={{ color: '#f43f5e', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                <strong style={{ color: '#f8fafc' }}>Action Recommended:</strong> You have {overdueBills.length} overdue invoices totaling {formatCurrency(totalOverdueMinor)}. Sending email payment reminders will accelerate settlement.
              </div>
            </div>
            {onNavigateToTab && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigateToTab('billing')}
                style={{ fontSize: '0.76rem', padding: '6px 12px' }}
              >
                Go to Billing & Invoices
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

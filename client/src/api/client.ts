// API client with MOCK mode. Backend not ready? You're still 100% productive.
// When NestJS is live: set VITE_API_URL=https://your-app.onrender.com/api/v1
// and VITE_MOCK=false. Everything else stays identical.

const API_URL = import.meta.env.VITE_API_URL ?? '';
export const IS_MOCK = (import.meta.env.VITE_MOCK ?? 'true') === 'true';
const MOCK = IS_MOCK;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Org-Id': getCurrentOrgId(), ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, body: string) { super(`API ${status}: ${body}`); }
}

// Demo auth: org switcher stores selection. Real JWT later — same header shape.
export function getCurrentOrgId(): string {
  return localStorage.getItem('demo_org_id') ?? 'org_sunrise_school';
}
export function switchOrg(orgId: string) { localStorage.setItem('demo_org_id', orgId); }

// ---------- Endpoints (contract for your backend teammate) ----------
export const api = {
  // Bills
  createBill: (b: NewBill) => post<Bill>('/bills', b),
  listBills: () => get<Bill[]>('/bills'),
  getBillByToken: (token: string) => get<Bill>(`/pay/${token}`),      // public, no auth
  getCheckoutUrl: (billId: string) => post<{ checkoutUrl: string }>(`/bills/${billId}/checkout`, {}),

  // Payroll
  listEmployees: () => get<Employee[]>('/employees'),
  addEmployee: (e: NewEmployee) => post<Employee>('/employees', e),
  createPayrollRun: (period: string) => post<PayrollRun>('/payroll-runs', { period }),
  approvePayrollRun: (id: string) => post<PayrollRun>(`/payroll-runs/${id}/approve`, {}),
  listPayrollRuns: () => get<PayrollRun[]>('/payroll-runs'),

  // Cross-border
  getFxQuote: (from: Currency, to: Currency, amountMinor: number) =>
    post<FxQuote>('/fx/quote', { fromCurrency: from, toCurrency: to, sendAmountMinor: amountMinor }),
  sendCrossBorder: (p: NewCrossBorderPayout) => post<CrossBorderPayout>('/fx/payouts', p),

  // Ledger & metrics
  listJournalEntries: () => get<JournalEntry[]>('/ledger/entries'),
  getMetrics: () => get<OrgMetrics>('/metrics'),
  getCopilotAnswer: (question: string) => post<CopilotAnswer>('/copilot/ask', { question }),
};

type NewBill = Pick<Bill, 'payerName' | 'description' | 'amountMinor' | 'currency'>;
type NewEmployee = Omit<Employee, 'id' | 'organizationId'>;
type NewCrossBorderPayout = Omit<CrossBorderPayout, 'id' | 'organizationId' | 'status'>;

const get = <T>(p: string) => (MOCK ? mockRoute<T>(p) : request<T>(p));
const post = <T>(p: string, body?: unknown) =>
  MOCK ? mockRoute<T>(p, body) : request<T>(p, { method: 'POST', body: JSON.stringify(body) });

// ---------- Mock layer: realistic flows you can build the UI against ----------
// The mock "database" lives in the browser's localStorage, so refreshes keep your demo data.
// The real NestJS + Neon backend replaces all of this later.
//
// KEY BEHAVIOUR: paying a bill and approving a payroll run now WRITE JOURNAL ENTRIES,
// exactly like the real backend will. So the Ledger page and the dashboard numbers move.

const MOCK_STORAGE_KEY = 'antigravity_mock_db_v2'; // bumped: v1 data had a different shape
const SEED_ORG = 'org_sunrise_school';

// The seeded "history" that makes the dashboard look alive on first load.
const SEED_ENTRY_IDS = new Set(['JE-1093', 'JE-1094']);
const BASE_WALLET = 4825000000;       // ₦48,250,000.00
const BASE_PAYROLL = 1480000000;      // ₦14,800,000.00
const BASE_COLLECTIONS = 9241050000;  // ₦92,410,500.00

type MockDb = { bills: Bill[]; runs: PayrollRun[]; employees: Employee[]; entries: JournalEntry[] };

function seedDb(): MockDb {
  const employees: Employee[] = [
    { id: 'emp_1', organizationId: SEED_ORG, name: 'Amina Yusuf', email: 'amina@school.ng',
      bankCode: '058', accountNumber: '0123456789', salaryMinor: 35000000, currency: 'NGN' },
    { id: 'emp_2', organizationId: SEED_ORG, name: 'Tunde Bello', email: 'tunde@school.ng',
      bankCode: '044', accountNumber: '0234567891', salaryMinor: 28000000, currency: 'NGN' },
    { id: 'emp_3', organizationId: SEED_ORG, name: 'Chioma Okafor', email: 'chioma@school.ng',
      bankCode: '057', accountNumber: '0345678912', salaryMinor: 42000000, currency: 'NGN' },
  ];
  const entries: JournalEntry[] = [
    { id: 'JE-1094', organizationId: SEED_ORG, description: 'Oct 2026 Payroll Execution',
      sourceType: 'PAYROLL', sourceId: 'run_1', createdAt: new Date().toISOString(),
      lines: [
        { id: 'l1', accountCode: 'PAYROLL_EXPENSE', direction: 'DEBIT', amountMinor: 1480000000, currency: 'NGN' },
        { id: 'l2', accountCode: 'KORA_WALLET', direction: 'CREDIT', amountMinor: 1480000000, currency: 'NGN' },
      ] },
    { id: 'JE-1093', organizationId: SEED_ORG, description: 'Tuition Fee Bill Collection',
      sourceType: 'BILL_PAY', sourceId: 'bill_seed', createdAt: new Date().toISOString(),
      lines: [
        { id: 'l3', accountCode: 'KORA_CLEARING', direction: 'DEBIT', amountMinor: 75000000, currency: 'NGN' },
        { id: 'l4', accountCode: 'BILLING_INCOME', direction: 'CREDIT', amountMinor: 75000000, currency: 'NGN' },
      ] },
  ];
  return { bills: [], runs: [], employees, entries };
}

let mockDb: MockDb = seedDb();

function saveMockDb() {
  try { localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockDb)); } catch { /* storage full/blocked: ignore */ }
}

function loadMockDb() {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<MockDb>;
      const seed = seedDb();
      mockDb = {
        bills: saved.bills ?? [],
        runs: saved.runs ?? [],
        employees: saved.employees ?? seed.employees,
        entries: saved.entries ?? seed.entries,
      };
    }
  } catch { /* corrupted storage -> start fresh */ }
}
loadMockDb(); // restore saved data as soon as the app loads

/** Wipe the demo data and start from the seed. Handy right before recording/presenting. */
export function resetMockDb() {
  localStorage.removeItem(MOCK_STORAGE_KEY);
  mockDb = seedDb();
}

function nextEntryId(): string {
  const max = mockDb.entries.reduce((m, e) => Math.max(m, Number(e.id.replace('JE-', '')) || 0), 0);
  return `JE-${max + 1}`;
}

/** Writes a balanced journal entry (one debit line + one credit line of the same amount). */
function postEntry(p: {
  organizationId: string; description: string; sourceType: JournalEntry['sourceType']; sourceId: string;
  debitAccount: string; creditAccount: string; amountMinor: number; currency: Currency;
}): JournalEntry {
  const stamp = Date.now();
  const entry: JournalEntry = {
    id: nextEntryId(), organizationId: p.organizationId, description: p.description,
    sourceType: p.sourceType, sourceId: p.sourceId, createdAt: new Date().toISOString(),
    lines: [
      { id: `l_${stamp}_d`, accountCode: p.debitAccount, direction: 'DEBIT', amountMinor: p.amountMinor, currency: p.currency },
      { id: `l_${stamp}_c`, accountCode: p.creditAccount, direction: 'CREDIT', amountMinor: p.amountMinor, currency: p.currency },
    ],
  };
  mockDb.entries.unshift(entry);
  return entry;
}

/** Dashboard numbers = seeded baseline + whatever the NEW ledger entries add (never a stored balance). */
function computeMetrics(org: string): OrgMetrics {
  const mine = mockDb.entries.filter(e => e.organizationId === org);
  const fresh = mine.filter(e => !SEED_ENTRY_IDS.has(e.id));
  const sum = (type: JournalEntry['sourceType'], account: string, dir: 'DEBIT' | 'CREDIT') =>
    fresh.filter(e => e.sourceType === type).flatMap(e => e.lines)
      .filter(l => l.accountCode === account && l.direction === dir)
      .reduce((s, l) => s + l.amountMinor, 0);
  const collected = sum('BILL_PAY', 'BILLING_INCOME', 'CREDIT');
  const paidOut = sum('PAYROLL', 'PAYROLL_EXPENSE', 'DEBIT');
  return {
    walletAssetMinor: BASE_WALLET + collected - paidOut,
    payrollDispatchedMinor: BASE_PAYROLL + paidOut,
    collectionsMinor: BASE_COLLECTIONS + collected,
    pendingOutbox: 0,
    journalEntryCount: mine.length,
    currency: 'NGN',
  };
}

async function mockRoute<T>(path: string, body?: unknown): Promise<T> {
  await new Promise(r => setTimeout(r, 250)); // fake latency so loading states get exercised
  const org = getCurrentOrgId();

  // ----- Bills -----
  if (path === '/bills' && body) {
    const bill: Bill = { ...(body as object), id: `bill_${Date.now()}`, organizationId: org,
      status: 'PENDING', payToken: `tok_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`,
      createdAt: new Date().toISOString() } as Bill;
    mockDb.bills.unshift(bill);
    saveMockDb();
    return bill as T;
  }
  if (path === '/bills') return mockDb.bills.filter(b => b.organizationId === org) as T;
  if (path.startsWith('/pay/')) {
    const bill = mockDb.bills.find(b => b.payToken === path.split('/')[2]);
    if (!bill) throw new ApiError(404, 'bill not found');
    return bill as T;
  }
  if (path.endsWith('/checkout')) {
    const id = path.split('/')[2];
    const bill = mockDb.bills.find(b => b.id === id);
    if (!bill) throw new ApiError(404, 'bill not found');
    // Only the FIRST payment writes to the ledger. A repeat is ignored (this is the idempotency the real webhook dedup gives you).
    if (bill.status === 'PENDING') {
      mockDb.bills = mockDb.bills.map(b => b.id === id ? { ...b, status: 'PAID', paidAt: new Date().toISOString() } : b);
      postEntry({
        organizationId: bill.organizationId, description: `Bill payment: ${bill.payerName} (${bill.description})`,
        sourceType: 'BILL_PAY', sourceId: bill.id, debitAccount: 'KORA_CLEARING', creditAccount: 'BILLING_INCOME',
        amountMinor: bill.amountMinor, currency: bill.currency,
      });
      saveMockDb();
    }
    return { checkoutUrl: 'https://checkout.korapay.com/mock-session' } as T; // demo shortcut: instant "paid"
  }

  // ----- Payroll -----
  if (path === '/employees' && body) {
    const emp: Employee = { ...(body as object), id: `emp_${Date.now()}`, organizationId: org } as Employee;
    mockDb.employees.push(emp);
    saveMockDb();
    return emp as T;
  }
  if (path === '/employees') return mockDb.employees.filter(e => e.organizationId === org) as T;
  if (path === '/payroll-runs' && body) {
    const staff = mockDb.employees.filter(e => e.organizationId === org);
    if (staff.length === 0) throw new ApiError(400, 'Add at least one employee before running payroll');
    const run: PayrollRun = { id: `run_${Date.now()}`, organizationId: org, period: (body as { period: string }).period,
      status: 'PENDING_APPROVAL', totalMinor: staff.reduce((s, e) => s + e.salaryMinor, 0),
      currency: 'NGN', employeeCount: staff.length, createdAt: new Date().toISOString() };
    mockDb.runs.unshift(run);
    saveMockDb();
    return run as T;
  }
  if (path.endsWith('/approve')) {
    const id = path.split('/')[2];
    const run = mockDb.runs.find(r => r.id === id);
    if (!run) throw new ApiError(404, 'payroll run not found');
    if (run.status === 'PENDING_APPROVAL') {
      mockDb.runs = mockDb.runs.map(r => r.id === id ? { ...r, status: 'COMPLETED', completedAt: new Date().toISOString() } : r);
      postEntry({
        organizationId: run.organizationId, description: `${run.period} Payroll Execution`,
        sourceType: 'PAYROLL', sourceId: run.id, debitAccount: 'PAYROLL_EXPENSE', creditAccount: 'KORA_WALLET',
        amountMinor: run.totalMinor, currency: run.currency,
      });
      saveMockDb();
    }
    return mockDb.runs.find(r => r.id === id) as T;
  }
  if (path === '/payroll-runs') return mockDb.runs.filter(r => r.organizationId === org) as T;

  // ----- Cross-border -----
  if (path === '/fx/quote') {
    const b = body as { fromCurrency: Currency; toCurrency: Currency; sendAmountMinor: number };
    return { id: `q_${Date.now()}`, ...b, rate: 0.078, receiveAmountMinor: Math.round(b.sendAmountMinor * 0.078),
      expiresAt: new Date(Date.now() + 5 * 60e3).toISOString() } as T;
  }
  if (path === '/fx/payouts') return { ...(body as object), id: `cb_${Date.now()}`, organizationId: org, status: 'SENT' } as T;

  // ----- Ledger, metrics, copilot -----
  if (path === '/ledger/entries') return mockDb.entries.filter(e => e.organizationId === org) as T;
  if (path === '/metrics') return computeMetrics(org) as T;
  if (path === '/copilot/ask') {
    const m = computeMetrics(org);
    return { question: (body as { question: string }).question,
      answerText: 'Based on your immutable ledger, payroll dispatched so far is shown below.',
      figures: [{ label: 'Payroll dispatched', amountMinor: m.payrollDispatchedMinor, currency: 'NGN' as Currency }],
      sourceEntries: mockDb.entries.filter(e => e.organizationId === org && e.sourceType === 'PAYROLL') } as T;
  }
  throw new ApiError(404, `no mock for ${path}`);
}

import type { Bill, PayrollRun, Employee, JournalEntry, Currency, CrossBorderPayout, FxQuote, OrgMetrics, CopilotAnswer } from './types';
// Shared API contract — frontend AND backend code against these types.
// Money is ALWAYS integer minor units (kobo, cents) paired with currency. Never floats. (ADR-001)

export type Currency = 'NGN' | 'KES' | 'GHS' | 'USD' | 'XOF' | 'XAF';

// ---------- Ledger ----------
export interface JournalEntry {
  id: string;                       // e.g. "JE-1094"
  organizationId: string;
  description: string;
  sourceType: 'PAYROLL' | 'BILL_PAY' | 'PAYOUT' | 'FX_CONVERSION' | 'REVERSAL';
  sourceId: string;                 // payrollRunId / billId / payoutId
  createdAt: string;                // ISO 8601
  lines: JournalLine[];             // ALWAYS ≥2, Σdebits === Σcredits
}

export interface JournalLine {
  id: string;
  accountCode: string;              // e.g. "PAYROLL_EXPENSE", "KORA_WALLET", "BILLING_INCOME"
  direction: 'DEBIT' | 'CREDIT';
  amountMinor: number;
  currency: Currency;
}

// ---------- Bills / Collections ----------
export type BillStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'REVERSED';

export interface Bill {
  id: string;
  organizationId: string;
  payerName: string;                // student/patient/customer — minimal PII (public token, not id)
  description: string;
  amountMinor: number;
  currency: Currency;
  status: BillStatus;
  payToken: string;                 // unguessable: /pay/<token> public page, no auth needed
  koraReference?: string;
  paidAt?: string;
  createdAt: string;
}

// ---------- Payroll ----------
export type PayrollRunStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHING' | 'COMPLETED' | 'FAILED';

export interface Employee {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  bankCode: string;                 // from Kora List Banks API
  accountNumber: string;
  salaryMinor: number;
  currency: Currency;
}

export interface PayrollRun {
  id: string;
  organizationId: string;
  period: string;                   // "2026-10"
  status: PayrollRunStatus;
  totalMinor: number;
  currency: Currency;
  employeeCount: number;
  koraBatchRef?: string;
  createdAt: string;
  completedAt?: string;
}

// ---------- Cross-border ----------
export interface FxQuote {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;                     // quote rate from Kora
  sendAmountMinor: number;
  receiveAmountMinor: number;
  expiresAt: string;                // quotes are short-lived; re-quote before payout
}

export interface CrossBorderPayout {
  id: string;
  organizationId: string;
  quoteId: string;
  recipientName: string;
  recipientCountry: string;         // "KE" | "GH" | ...
  payoutMethod: 'BANK' | 'MOBILE_MONEY';
  status: 'QUOTED' | 'SENT' | 'CONFIRMED' | 'FAILED';
  koraReference?: string;
}

// ---------- Metrics & AI ----------
export interface OrgMetrics {
  walletAssetMinor: number;         // derived from ledger — never a stored balance
  payrollDispatchedMinor: number;
  collectionsMinor: number;
  pendingOutbox: number;            // count of outbox events
  journalEntryCount: number;
  currency: Currency;
}

export interface CopilotAnswer {
  question: string;
  answerText: string;
  figures: { label: string; amountMinor: number; currency: Currency }[];
  sourceEntries: JournalEntry[];    // receipts: which ledger entries backed the answer
}

// ---------- Auth (demo-grade) ----------
export interface DemoUser {
  id: string;
  organizationId: string;
  organizationName: string;
  vertical: 'SCHOOL' | 'HOSPITAL' | 'COMPANY';  // SAME engine, different demo org
}
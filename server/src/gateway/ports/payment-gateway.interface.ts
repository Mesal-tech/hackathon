import { SupportedCurrency, PaymentStatus, PayoutStatus } from '../../shared/index.js';

export interface ChargeInput {
  reference: string;
  amountMinor: number;
  currency: SupportedCurrency;
  customer: {
    name: string;
    email: string;
  };
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ChargeInit {
  checkoutUrl: string;
  reference: string;
}

export interface ChargeStatusResult {
  reference: string;
  amountMinor: number;
  currency: SupportedCurrency;
  status: PaymentStatus;
  paidAt?: Date;
  rawResponse?: unknown;
}

export interface RefundInput {
  paymentReference: string;
  amountMinor: number;
  reason: string;
  refundReference: string;
}

export interface RefundResult {
  refundReference: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
}

export interface PayoutInput {
  deterministicReference: string; // e.g. payout-<payoutId>
  amountMinor: number;
  currency: SupportedCurrency;
  destination: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
  narration?: string;
}

export interface PayoutResult {
  providerReference: string;
  status: PayoutStatus;
}

export interface ResolvedAccount {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  currency: SupportedCurrency;
}

export interface RateQuery {
  sourceCurrency: SupportedCurrency;
  targetCurrency: SupportedCurrency;
  amountMinor: number;
}

export interface FxQuoteResult {
  quoteId: string;
  rate: number;
  sourceAmountMinor: number;
  targetAmountMinor: number;
  expiresAt: Date;
}

export interface ConversionResult {
  conversionReference: string;
  status: 'SUCCESS' | 'FAILED';
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface Settlement {
  id: string;
  amountMinor: number;
  currency: SupportedCurrency;
  channel: string;
  settledAt: Date;
}

export interface PaymentGateway {
  initializeCharge(i: ChargeInput): Promise<ChargeInit>;
  getCharge(ref: string): Promise<ChargeStatusResult>;
  refundCharge(i: RefundInput): Promise<RefundResult>;
  disburse(i: PayoutInput): Promise<PayoutResult>; // deterministic reference required
  getPayout(ref: string): Promise<PayoutStatus>;
  resolveBankAccount(bank: string, acct: string): Promise<ResolvedAccount>;
  getRate(q: RateQuery): Promise<FxQuoteResult>;
  convert(q: FxQuoteResult): Promise<ConversionResult>;
  listSettlements(range: DateRange): Promise<Settlement[]>;
  verifyWebhook(raw: string, sig: string): boolean;
}

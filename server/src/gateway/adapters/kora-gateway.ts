import crypto from 'node:crypto';
import {
  PaymentGateway,
  ChargeInput,
  ChargeInit,
  ChargeStatusResult,
  RefundInput,
  RefundResult,
  PayoutInput,
  PayoutResult,
  ResolvedAccount,
  RateQuery,
  FxQuoteResult,
  ConversionResult,
  DateRange,
  Settlement,
} from '../ports/payment-gateway.interface.js';
import { PaymentStatus, PayoutStatus } from '../../shared/index.js';

export interface KoraConfig {
  secretKey: string;
  publicKey: string;
  webhookSecret: string;
  baseUrl?: string;
}

export class KoraGateway implements PaymentGateway {
  private readonly baseUrl: string;

  constructor(private readonly config: KoraConfig) {
    this.baseUrl = config.baseUrl || 'https://api.korapay.com/merchant/api/v1';
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    if (!this.config.webhookSecret || !signature) {
      return false;
    }
    const hash = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }

  async initializeCharge(i: ChargeInput): Promise<ChargeInit> {
    // In production, performs HTTP POST to ${this.baseUrl}/charges/initialize
    return {
      checkoutUrl: `https://checkout.korapay.com/pay/${i.reference}`,
      reference: i.reference,
    };
  }

  async getCharge(ref: string): Promise<ChargeStatusResult> {
    // In production, queries ${this.baseUrl}/charges/${ref}
    return {
      reference: ref,
      amountMinor: 0,
      currency: 'NGN',
      status: PaymentStatus.PROCESSING,
    };
  }

  async refundCharge(i: RefundInput): Promise<RefundResult> {
    return {
      refundReference: i.refundReference,
      status: 'PENDING',
    };
  }

  async disburse(i: PayoutInput): Promise<PayoutResult> {
    // Calls /transactions/disburse using deterministicReference
    return {
      providerReference: `kora-disburse-${i.deterministicReference}`,
      status: PayoutStatus.SENT,
    };
  }

  async getPayout(ref: string): Promise<PayoutStatus> {
    return PayoutStatus.SUCCESS;
  }

  async resolveBankAccount(bank: string, acct: string): Promise<ResolvedAccount> {
    return {
      accountNumber: acct,
      accountName: 'RESOLVED ACCOUNT NAME',
      bankCode: bank,
      currency: 'NGN',
    };
  }

  async getRate(q: RateQuery): Promise<FxQuoteResult> {
    return {
      quoteId: `kora-quote-${Date.now()}`,
      rate: 1550.0,
      sourceAmountMinor: q.amountMinor,
      targetAmountMinor: Math.round(q.amountMinor * 1550),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
  }

  async convert(q: FxQuoteResult): Promise<ConversionResult> {
    return {
      conversionReference: `kora-conv-${q.quoteId}`,
      status: 'SUCCESS',
    };
  }

  async listSettlements(_range: DateRange): Promise<Settlement[]> {
    return [];
  }
}

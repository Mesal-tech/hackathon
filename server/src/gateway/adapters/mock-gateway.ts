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

export class MockGateway implements PaymentGateway {
  private charges = new Map<string, ChargeStatusResult>();
  private payouts = new Map<string, PayoutStatus>();

  async initializeCharge(i: ChargeInput): Promise<ChargeInit> {
    const init: ChargeInit = {
      checkoutUrl: `https://checkout.sandbox.mock-pay.internal/${i.reference}`,
      reference: i.reference,
    };
    this.charges.set(i.reference, {
      reference: i.reference,
      amountMinor: i.amountMinor,
      currency: i.currency,
      status: PaymentStatus.PROCESSING,
    });
    return init;
  }

  async getCharge(ref: string): Promise<ChargeStatusResult> {
    const existing = this.charges.get(ref);
    if (!existing) {
      return {
        reference: ref,
        amountMinor: 0,
        currency: 'NGN',
        status: PaymentStatus.FAILED,
      };
    }
    return existing;
  }

  simulateChargeSuccess(ref: string): void {
    const existing = this.charges.get(ref);
    if (existing) {
      existing.status = PaymentStatus.SUCCESS;
      existing.paidAt = new Date();
    }
  }

  async refundCharge(i: RefundInput): Promise<RefundResult> {
    return {
      refundReference: i.refundReference,
      status: 'SUCCESS',
    };
  }

  async disburse(i: PayoutInput): Promise<PayoutResult> {
    this.payouts.set(i.deterministicReference, PayoutStatus.SUCCESS);
    return {
      providerReference: `mock-kora-payout-${Date.now()}`,
      status: PayoutStatus.SUCCESS,
    };
  }

  async getPayout(ref: string): Promise<PayoutStatus> {
    return this.payouts.get(ref) ?? PayoutStatus.SUCCESS;
  }

  async resolveBankAccount(bank: string, acct: string): Promise<ResolvedAccount> {
    return {
      accountNumber: acct,
      accountName: 'DEMO NIGERIA CORP / JOHN DOE',
      bankCode: bank,
      currency: 'NGN',
    };
  }

  async getRate(q: RateQuery): Promise<FxQuoteResult> {
    const rate = q.sourceCurrency === 'USD' && q.targetCurrency === 'NGN' ? 1500 : 0.00067;
    return {
      quoteId: `quote-${Date.now()}`,
      rate,
      sourceAmountMinor: q.amountMinor,
      targetAmountMinor: Math.round(q.amountMinor * rate),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    };
  }

  async convert(_q: FxQuoteResult): Promise<ConversionResult> {
    return {
      conversionReference: `conv-${Date.now()}`,
      status: 'SUCCESS',
    };
  }

  async listSettlements(_range: DateRange): Promise<Settlement[]> {
    return [];
  }

  verifyWebhook(_raw: string, _sig: string): boolean {
    return true;
  }
}

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
import { PayoutStatus } from '../../shared/index.js';

export interface ChaosConfig {
  simulateTimeout?: boolean;
  simulateFailure?: boolean;
  simulateStuckPayout?: boolean;
  latencyMs?: number;
}

export class FaultInjectingGateway implements PaymentGateway {
  constructor(
    private readonly underlying: PaymentGateway,
    private config: ChaosConfig = {}
  ) {}

  setChaos(config: ChaosConfig): void {
    this.config = { ...this.config, ...config };
  }

  private async applyChaos(): Promise<void> {
    if (this.config.latencyMs && this.config.latencyMs > 0) {
      await new Promise((res) => setTimeout(res, this.config.latencyMs));
    }
    if (this.config.simulateTimeout) {
      throw new Error('CHAOS_TIMEOUT: Gateway request timed out');
    }
    if (this.config.simulateFailure) {
      throw new Error('CHAOS_ERROR: Internal Gateway provider downstream error');
    }
  }

  async initializeCharge(i: ChargeInput): Promise<ChargeInit> {
    await this.applyChaos();
    return this.underlying.initializeCharge(i);
  }

  async getCharge(ref: string): Promise<ChargeStatusResult> {
    await this.applyChaos();
    return this.underlying.getCharge(ref);
  }

  async refundCharge(i: RefundInput): Promise<RefundResult> {
    await this.applyChaos();
    return this.underlying.refundCharge(i);
  }

  async disburse(i: PayoutInput): Promise<PayoutResult> {
    await this.applyChaos();
    if (this.config.simulateStuckPayout) {
      return {
        providerReference: `stuck-payout-${Date.now()}`,
        status: PayoutStatus.UNKNOWN,
      };
    }
    return this.underlying.disburse(i);
  }

  async getPayout(ref: string): Promise<PayoutStatus> {
    await this.applyChaos();
    return this.underlying.getPayout(ref);
  }

  async resolveBankAccount(bank: string, acct: string): Promise<ResolvedAccount> {
    await this.applyChaos();
    return this.underlying.resolveBankAccount(bank, acct);
  }

  async getRate(q: RateQuery): Promise<FxQuoteResult> {
    await this.applyChaos();
    return this.underlying.getRate(q);
  }

  async convert(q: FxQuoteResult): Promise<ConversionResult> {
    await this.applyChaos();
    return this.underlying.convert(q);
  }

  async listSettlements(range: DateRange): Promise<Settlement[]> {
    await this.applyChaos();
    return this.underlying.listSettlements(range);
  }

  verifyWebhook(raw: string, sig: string): boolean {
    return this.underlying.verifyWebhook(raw, sig);
  }
}

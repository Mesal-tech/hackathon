import { PaymentGateway } from '../../gateway/index.js';

export interface WebhookJobData {
  eventId: string;
  provider: string;
  reference: string;
  expectedAmountMinor: number;
  currency: string;
}

export class WebhookProcessor {
  constructor(private readonly gateway: PaymentGateway) {}

  async process(job: { data: WebhookJobData }): Promise<void> {
    const { eventId, reference, expectedAmountMinor, currency } = job.data;
    console.log(`[Worker:Webhook] Processing webhook event ${eventId} for ref ${reference}`);

    // Re-query Kora before the ledger moves ("Never trust a callback" principle)
    const status = await this.gateway.getCharge(reference);
    
    if (status.amountMinor !== expectedAmountMinor || status.currency !== currency) {
      console.warn(`[Worker:Webhook] Mismatch detected on ref ${reference}! Expected ${expectedAmountMinor} ${currency}, got ${status.amountMinor} ${status.currency}`);
    }

    console.log(`[Worker:Webhook] Verified charge status for ${reference}: ${status.status}`);
  }
}

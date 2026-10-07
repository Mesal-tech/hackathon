import { PaymentGateway, PayoutInput } from '../../gateway/index.js';

export interface OutboxJobData {
  outboxId: string;
  aggregateType: string;
  aggregateId: string;
  type: string;
  payload: PayoutInput;
}

export class OutboxProcessor {
  constructor(private readonly gateway: PaymentGateway) {}

  async process(job: { data: OutboxJobData }): Promise<void> {
    const { outboxId, payload } = job.data;
    console.log(`[Worker:Outbox] Processing outbox job ${outboxId} with deterministic ref: ${payload.deterministicReference}`);

    const result = await this.gateway.disburse(payload);
    console.log(`[Worker:Outbox] Outbox job ${outboxId} dispatched to gateway: ${result.providerReference}`);
  }
}

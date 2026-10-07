import { MockGateway } from '../gateway/index.js';
import { OutboxProcessor } from './processors/outbox.processor.js';
import { WebhookProcessor } from './processors/webhook.processor.js';

async function startWorker() {
  console.log('[Worker] Initializing BullMQ processors...');
  const gateway = new MockGateway();
  const outboxProcessor = new OutboxProcessor(gateway);
  const webhookProcessor = new WebhookProcessor(gateway);

  console.log('[Worker] Outbox and Webhook processors initialized and waiting for queue events.');
}

startWorker().catch((err) => {
  console.error('[Worker] Fatal error in worker daemon:', err);
  process.exit(1);
});

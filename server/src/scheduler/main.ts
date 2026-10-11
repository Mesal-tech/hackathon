import { KoraGateway } from '../gateway/index.js';
import { DailyReconciliationJob } from './jobs/daily-reconciliation.job.js';

async function startScheduler() {
  console.log('[Scheduler] Starting background cron manager...');
  const gateway = new KoraGateway({
    secretKey: process.env.KORA_SECRET_KEY || '',
    publicKey: process.env.KORA_PUBLIC_KEY || '',
    webhookSecret: process.env.KORA_WEBHOOK_SECRET || '',
    baseUrl: process.env.KORA_BASE_URL,
  });
  const reconcileJob = new DailyReconciliationJob(gateway);

  // Run initial sweep on boot
  await reconcileJob.run();
  console.log('[Scheduler] Cron jobs scheduled successfully.');
}

startScheduler().catch((err) => {
  console.error('[Scheduler] Fatal error in scheduler daemon:', err);
  process.exit(1);
});

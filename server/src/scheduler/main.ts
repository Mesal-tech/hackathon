import { MockGateway } from '../gateway/index.js';
import { DailyReconciliationJob } from './jobs/daily-reconciliation.job.js';

async function startScheduler() {
  console.log('[Scheduler] Starting background cron manager...');
  const gateway = new MockGateway();
  const reconcileJob = new DailyReconciliationJob(gateway);

  // Run initial sweep on boot
  await reconcileJob.run();
  console.log('[Scheduler] Cron jobs scheduled successfully.');
}

startScheduler().catch((err) => {
  console.error('[Scheduler] Fatal error in scheduler daemon:', err);
  process.exit(1);
});

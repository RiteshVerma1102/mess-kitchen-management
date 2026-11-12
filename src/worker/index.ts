import { Queue, Worker, type Job } from 'bullmq';
import { getEnv } from '@/config/env';
import { bullConnectionOptions } from '@/lib/redis';
import { logger } from '@/lib/logger';

// Separate process from the web server. Scheduled work is BullMQ repeatable
// jobs, never an in-process cron.
export const QUEUES = { forecast: 'forecast-daily', reminders: 'missing-actuals' } as const;

async function main() {
  const env = getEnv();

  const forecastQ = new Queue(QUEUES.forecast, { connection: bullConnectionOptions() });
  const reminderQ = new Queue(QUEUES.reminders, { connection: bullConnectionOptions() });

  // upsert = idempotent: restarting the worker never duplicates schedules.
  await forecastQ.upsertJobScheduler('daily-7-day-forecast', { pattern: env.FORECAST_CRON, tz: 'Asia/Kolkata' }, { name: 'run-forecast' });
  await reminderQ.upsertJobScheduler('missing-actuals-reminder', { pattern: env.REMINDER_CRON, tz: 'Asia/Kolkata' }, { name: 'send-reminders' });

  new Worker(QUEUES.forecast, async (job: Job) => {
    logger.info({ job: job.name }, 'forecast job started'); // implemented in Prompt 6 (M5)
  }, { connection: bullConnectionOptions() });

  new Worker(QUEUES.reminders, async (job: Job) => {
    logger.info({ job: job.name }, 'reminder job started'); // implemented in Prompt 7 (M7)
  }, { connection: bullConnectionOptions() });

  logger.info('worker ready');
}

main().catch((e) => { logger.fatal({ err: (e as Error).message }, 'worker failed to start'); process.exit(1); });

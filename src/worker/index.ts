import { Queue, Worker, type Job } from 'bullmq';
import { getEnv } from '@/config/env';
import { bullConnectionOptions } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { connectDb } from '@/lib/db';
import { InstitutionModel } from '@/core/tenant/institution.model';
import { generateDailyMealDemandForecast } from '@/modules/forecasting/forecast.service';

export const QUEUES = { forecast: 'forecast-daily', reminders: 'missing-actuals' } as const;

async function runScheduledDailyForecasts() {
  await connectDb();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const institutions = await InstitutionModel.find({ active: true }).lean();

  for (const inst of institutions) {
    const institutionId = String(inst._id);
    const mockSession = {
      userId: 'system_forecast_worker',
      institutionId,
      role: 'admin' as const,
      hallIds: [],
    };

    for (const hall of inst.diningHalls || [{ id: 'hall_a' }]) {
      try {
        await generateDailyMealDemandForecast(mockSession, {
          targetDate: tomorrow,
          messHallId: hall.id,
        });
        logger.info({ institutionId, messHallId: hall.id, date: tomorrow }, 'forecast computed');
      } catch (err) {
        logger.error({ err: (err as Error).message, institutionId, messHallId: hall.id }, 'failed to compute forecast');
      }
    }
  }
}

async function main() {
  const env = getEnv();

  const forecastQ = new Queue(QUEUES.forecast, { connection: bullConnectionOptions() });
  const reminderQ = new Queue(QUEUES.reminders, { connection: bullConnectionOptions() });

  await forecastQ.upsertJobScheduler('daily-7-day-forecast', { pattern: env.FORECAST_CRON, tz: 'Asia/Kolkata' }, { name: 'run-forecast' });
  await reminderQ.upsertJobScheduler('missing-actuals-reminder', { pattern: env.REMINDER_CRON, tz: 'Asia/Kolkata' }, { name: 'send-reminders' });

  new Worker(QUEUES.forecast, async (job: Job) => {
    logger.info({ job: job.name }, 'forecast job started');
    await runScheduledDailyForecasts();
    logger.info({ job: job.name }, 'forecast job finished');
  }, { connection: bullConnectionOptions() });

  new Worker(QUEUES.reminders, async (job: Job) => {
    logger.info({ job: job.name }, 'reminder job started');
  }, { connection: bullConnectionOptions() });

  logger.info('worker ready');
}

main().catch((e) => { logger.fatal({ err: (e as Error).message }, 'worker failed to start'); process.exit(1); });

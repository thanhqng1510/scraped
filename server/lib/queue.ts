import { Queue, Worker } from 'bullmq';
import { env } from '../env';

const MAX_JOB_RETRIES = 5;
const JOB_BACKOFF_STRATEGY = 'exponential';
const JOB_BACKOFF_DELAY_MS = 5000;

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

export const scrapeQueue = new Queue('scrape', { 
  connection,
  defaultJobOptions: {
    attempts: MAX_JOB_RETRIES,
    backoff: {
      type: JOB_BACKOFF_STRATEGY,
      delay: JOB_BACKOFF_DELAY_MS,
    },
  },
});

export const createWorker = (processor: (job: any) => Promise<any>) => {
  return new Worker('scrape', processor, { connection });
};
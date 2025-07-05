import { Queue, Worker } from 'bullmq';
import { env } from '../env';

const MAX_JOB_RETRIES = 10;
const JOB_BACKOFF_STRATEGY = 'exponential';
const JOB_BACKOFF_DELAY_MS = 1000;

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

export const notiQueue = new Queue('noti', { 
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: MAX_JOB_RETRIES,
    backoff: {
      type: JOB_BACKOFF_STRATEGY,
      delay: JOB_BACKOFF_DELAY_MS,
    },
  },
});

export const createWorker = (processor: (job: any) => Promise<any>) => {
  return new Worker('noti', processor, { connection });
};

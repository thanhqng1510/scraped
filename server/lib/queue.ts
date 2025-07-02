import { Queue, Worker } from 'bullmq';
import { env } from '../env';

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

export const scrapeQueue = new Queue('scrape', { connection });

export const createWorker = (processor: (job: any) => Promise<any>) => {
  return new Worker('scrape', processor, { connection });
};
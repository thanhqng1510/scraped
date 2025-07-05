import { Queue, Worker } from 'bullmq';
import { env } from '../env';

const MAX_JOB_RETRIES = 10;
const JOB_BACKOFF_STRATEGY = 'exponential';
const JOB_BACKOFF_DELAY_MS = 2000;

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

export const scrapeQueue = new Queue('scrape', {
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
  return new Worker('scrape', processor, { connection });
};

// --------------------------------------------------------------

const MAX_ENQUEUE_RETRIES = 10;
const ENQUEUE_RETRY_DELAY_MS = 1000;

export const enqueueScrapingJobs = async (keywordIds: string[], notiId: string) => {
  if (!keywordIds || keywordIds.length === 0) {
    console.log('No scraping jobs to enqueue.');
    return;
  }

  const jobs = keywordIds.map((keywordId) => ({
    name: 'scrape',
    data: { keywordId, notiId },
    opts: {
      jobId: `scrape-${keywordId}`,
    },
  }));

  let attempts = 0;
  while (attempts < MAX_ENQUEUE_RETRIES) {
    try {
      const addedJobs = await scrapeQueue.addBulk(jobs);
      console.log(`Successfully enqueued ${addedJobs.length} scraping jobs.`);
      return; // Success, exit loop
    } catch (error) {
      attempts++;
      console.error(
        `Attempt ${attempts} to bulk enqueue ${jobs.length} jobs for notiId ${notiId} failed:`,
        error,
      );

      if (attempts < MAX_ENQUEUE_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, ENQUEUE_RETRY_DELAY_MS));
      } else {
        console.error(
          `Failed to enqueue ${jobs.length} scraping jobs for notiId ${notiId} after ${MAX_ENQUEUE_RETRIES} attempts.`,
        );
      }
    }
  }
};

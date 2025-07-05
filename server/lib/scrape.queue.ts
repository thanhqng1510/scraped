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

export interface EnqueueScrapeJobData {
  keywordId: string;
  notiId: string;
}

const MAX_ENQUEUE_RETRIES = 10;
const ENQUEUE_RETRY_DELAY_MS = 1000;

const enqueueJobWithRetry = async (keywordId: string, notiId: string): Promise<void> => {
  let attempts = 0;
  while (attempts < MAX_ENQUEUE_RETRIES) {
    try {
      await scrapeQueue.add(
        'scrape',
        { keywordId, notiId },
        {
          jobId: `scrape-${keywordId}`,
          removeOnComplete: {
            age: 3600, // keep up to 1 hour
            count: 1000, // keep up to 1000 jobs
          },
          removeOnFail: {
            age: 24 * 3600, // keep up to 24 hours
          },
        },
      );
      return; // Success, exit loop
    } catch (error) {
      attempts++;
      console.error(
        `Attempt ${attempts} to enqueue job for keywordId ${keywordId} failed:`, error
      );
      if (attempts < MAX_ENQUEUE_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, ENQUEUE_RETRY_DELAY_MS));
      } else {
        throw new Error(`Failed to enqueue job for keywordId ${keywordId} after ${MAX_ENQUEUE_RETRIES} attempts.`);
      }
    }
  }
};

export const enqueueScrapingJobs = async (keywordIds: string[], notiId: string) => {
  const enqueuePromises = keywordIds.map((keywordId) =>
    enqueueJobWithRetry(keywordId, notiId)
  );

  const results = await Promise.allSettled(enqueuePromises);

  const successfullyEnqueued = results.filter(r => r.status === 'fulfilled').length;
  const failedToEnqueue = results.filter(r => r.status === 'rejected');

  if (failedToEnqueue.length > 0) {
    console.error(
      `Failed to enqueue ${failedToEnqueue.length} scraping jobs after ${MAX_ENQUEUE_RETRIES} attempts.`
    );
    failedToEnqueue.forEach((result: PromiseRejectedResult) => {
      console.error(`  - ${result.reason}`);
    });
    // In a real application, you might want to alert an administrator or log this to a persistent store
  } else {
    console.log(`Successfully enqueued ${successfullyEnqueued} scraping jobs.`);
  }
};

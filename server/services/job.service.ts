import { scrapeQueue } from '../lib/queue';

export interface EnqueueScrapeJobData {
  keywordId: string;
}

const MAX_ENQUEUE_RETRIES = 5;
const ENQUEUE_RETRY_DELAY_MS = 1000; // 1 second

const enqueueJobWithRetry = async (keywordId: string): Promise<void> => {
  let attempts = 0;
  while (attempts < MAX_ENQUEUE_RETRIES) {
    try {
      await scrapeQueue.add('scrape', { keywordId });
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

export const enqueueScrapingJobs = async (keywordIds: string[]) => {
  const enqueuePromises = keywordIds.map((keywordId) =>
    enqueueJobWithRetry(keywordId)
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

import { createWorker } from '../lib/queue';

console.log('Worker started');

const worker = createWorker(async (job) => {
  console.log(`Processing job ${job.id} for keyword ${job.data.keywordId}`);
  // Simulate scraping work
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log(`Finished job ${job.id}`);
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed.`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);
});

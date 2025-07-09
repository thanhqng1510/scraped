import { createWorker } from '../lib/scrape.queue';
import { Scraper } from './scraper';
import { BingSearchEngine } from './search-engines/bing-search-engine';
import { BingHtmlParser } from './html-parsers/bing-html-parser';

const bingScraper = new Scraper(
  new BingSearchEngine(),
  new BingHtmlParser()
);

const bingScraperWorker = createWorker((job) => bingScraper.run(job));

bingScraperWorker.on('active', (job) => {
  console.log(`Job ${job.id} is active.`);
});

bingScraperWorker.on('closing', (msg) => {
  console.log('Worker closing:', msg);
});

bingScraperWorker.on('closed', () => {
  console.log('Worker closed.');
});

bingScraperWorker.on('completed', (job, res) => {
  console.log(`Job ${job.id} completed with result:`, res);
});

bingScraperWorker.on('drained', () => {
  console.log('Worker drained.');
});

bingScraperWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

bingScraperWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

bingScraperWorker.on('ioredis:close', () => {
  console.log('IORedis connection closed.');
});

bingScraperWorker.on('paused', () => {
  console.log('Worker paused.');
});

bingScraperWorker.on('ready', () => {
  console.log('Worker is ready.');
});

bingScraperWorker.on('resumed', () => {
  console.log('Worker resumed.');
});

bingScraperWorker.on('stalled', () => {
  console.log('Worker stalled.');
});

export default bingScraperWorker;

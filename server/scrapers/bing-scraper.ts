import { createWorker } from '../lib/scrape.queue';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import prisma from '../lib/prisma';
import { env } from '../env';
import { loadProxies, getRandomProxy } from './services/proxy.service';
import { getRandomUserAgent } from './services/user-agent.service';
import { notiQueue } from '../lib/noti.queue';
import { Browser, Page } from 'puppeteer';

loadProxies();
puppeteer.use(StealthPlugin());
console.log('Worker started');

// Helper function to initialize browser and page
async function initializeBrowserAndPage() {
  const launchOptions: any = {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    headless: 'new'
  };

  const proxy = getRandomProxy();
  if (proxy) {
    launchOptions.args.push(`--proxy-server=${proxy.split('@')[1]}`);
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);

  if (proxy && proxy.includes('@')) {
    const [username, password] = proxy.split('//')[1].split('@')[0].split(':');
    await page.authenticate({ username, password });
  }

  await page.setUserAgent(getRandomUserAgent());

  return { browser, page };
}

// Helper function to perform Bing search and get HTML
async function performBingSearch(page: Page, keywordText: string) {
  const searchUrl = `${env.BING_SEARCH_URL}${encodeURIComponent(keywordText)}`;
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });
  return await page.content();
}

// Helper function to parse HTML and extract data
function parseBingResults(html: string) {
  const $ = cheerio.load(html);
  const totalAds = $('.sb_add, .ads, .b_ad, [data-bm]').length;
  const totalLinks = $('a').length;
  return { totalAds, totalLinks };
}

// Helper function to update keyword status and save scrape attempt
async function updateKeywordAndSaveScrapeAttempt(
  keywordData: { id: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' },
  scrapeAttemptData: { html: string | null, adCount: number, linkCount: number, status: 'SUCCESS' | 'FAILED' } | null
) {
  let scrapeAttempt: any;
  await prisma.$transaction(async (tx) => {
    await tx.keyword.update({
      where: { id: keywordData.id },
      data: { status: keywordData.status },
    });

    if (scrapeAttemptData) {
      scrapeAttempt = await tx.scrapeAttempt.create({
        data: {
          keywordId: keywordData.id,
          html: scrapeAttemptData.html,
          adCount: scrapeAttemptData.adCount,
          linkCount: scrapeAttemptData.linkCount,
          status: scrapeAttemptData.status
        },
      });
    }
  });
  return scrapeAttempt;
}

// Helper function to handle scrape failures
async function handleScrapeFailure(job: any, keywordId: string, error: any, notiId: string) {
  console.error(`Job ${job.id} for keyword ${keywordId} failed:`, error);

  let status: 'PENDING' | 'FAILED';
  if (job.attemptsMade + 1 >= job.opts.attempts) {
    console.log(`Job ${job?.id} for keyword ${job.data.keywordId} permanently failed after ${job.attemptsMade + 1} attempts.`);
    status = 'FAILED';
  } else {
    console.log(`Job ${job.id} for keyword ${job.data.keywordId} failed. Retrying...`);
    status = 'PENDING';
  }

  const scrapeAttempt = await updateKeywordAndSaveScrapeAttempt(
    { id: keywordId, status },
    { html: null, adCount: 0, linkCount: 0, status: 'FAILED'}
  );

  await notiQueue.add('noti', {
    notiId,
    eventType: 'keyword_update',
    data: { id: keywordId, status },
  });

  await notiQueue.add('noti', {
    notiId,
    eventType: 'scrape_attempt_create',
    data: { ...scrapeAttempt, keywordId },
  });

  throw error; // Re-throw to mark job as failed in BullMQ
}

const bingScraper = createWorker(async (job) => {
  const { keywordId, notiId } = job.data;
  console.log(`Processing job ${job.id} for keyword ${keywordId}`);

  const keywordRecord = await prisma.keyword.findUnique({
    where: { id: keywordId },
  });

  if (!keywordRecord) {
    console.error(`Keyword with ID ${keywordId} not found.`);
    throw new Error(`Keyword with ID ${keywordId} not found.`);
  }

  await updateKeywordAndSaveScrapeAttempt(
    { id: keywordId, status: 'IN_PROGRESS' },
    null,
  );

  await notiQueue.add('noti', {
    notiId,
    eventType: 'keyword_update',
    data: { id: keywordId, status: 'IN_PROGRESS' },
  });

  let browser: Browser | null = null;
  let page: Page | null = null;
  try {
    ({ browser, page } = await initializeBrowserAndPage());
    console.log('Browser launched and page created');

    const html = await performBingSearch(page, keywordRecord.text);
    console.log('Navigated to Bing search URL and got HTML');

    const { totalAds, totalLinks } = parseBingResults(html);

    const scrapeAttempt = await updateKeywordAndSaveScrapeAttempt(
      { id: keywordId, status: 'COMPLETED' },
      { html, adCount: totalAds, linkCount: totalLinks, status: 'SUCCESS' },
    );

    await notiQueue.add('noti', {
      notiId,
      eventType: 'keyword_update',
      data: { id: keywordId, status: 'COMPLETED' },
    });

    await notiQueue.add('noti', {
      notiId,
      eventType: 'scrape_attempt_create',
      data: { ...scrapeAttempt, keywordId: keywordId },
    });

    console.log(`Finished job ${job.id} for keyword ${keywordId}. Ads: ${totalAds}, Links: ${totalLinks}`);
  } catch (error: any) {
    await handleScrapeFailure(job, keywordId, error, notiId);
  } finally {
    await page?.close({ runBeforeUnload: false });
    console.log('Page closed');

    await browser?.close();
    console.log('Browser closed');
  }

  console.log('Job completed');
});

bingScraper.on('active', (job) => {
  console.log(`Job ${job.id} is active.`);
});

bingScraper.on('closing', (msg) => {
  console.log('Worker closing:', msg);
});

bingScraper.on('closed', () => {
  console.log('Worker closed.');
});

bingScraper.on('completed', (job, res) => {
  console.log(`Job ${job.id} completed with result:`, res);
});

bingScraper.on('drained', () => {
  console.log('Worker drained.');
});

bingScraper.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

bingScraper.on('error', (err) => {
  console.error('Worker error:', err);
});

bingScraper.on('ioredis:close', () => {
  console.log('IORedis connection closed.');
});

bingScraper.on('paused', () => {
  console.log('Worker paused.');
});

bingScraper.on('ready', () => {
  console.log('Worker is ready.');
});

bingScraper.on('resumed', () => {
  console.log('Worker resumed.');
});

bingScraper.on('stalled', () => {
  console.log('Worker stalled.');
});
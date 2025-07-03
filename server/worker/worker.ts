import { createWorker } from '../lib/queue';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import prisma from '../lib/prisma';
import { env } from '../env';
import { loadProxies, getRandomProxy } from './services/proxy.service';
import { getRandomUserAgent } from './services/user-agent.service';


// Load proxies when the worker starts
loadProxies();
puppeteer.use(StealthPlugin());
console.log('Worker started');

const worker = createWorker(async (job) => {
  const { keywordId } = job.data;
  console.log(`Processing job ${job.id} for keyword ${keywordId}`);

  const keywordRecord = await prisma.keyword.findUnique({
    where: { id: keywordId },
  });

  if (!keywordRecord) {
    console.error(`Keyword with ID ${keywordId} not found.`);
    throw new Error(`Keyword with ID ${keywordId} not found.`);
  }

  // Update keyword status to 'In Progress'
  await prisma.keyword.update({
    where: { id: keywordId },
    data: { status: 'IN_PROGRESS' },
  });

  let browser;
  try {
    const proxy = getRandomProxy();
    const launchOptions: any = { headless: 'new' };
    if (proxy) {
      launchOptions.args = [`--proxy-server=${proxy.split('@')[1]}`]; // Extract host:port
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    if (proxy && proxy.includes('@')) {
      const [username, password] = proxy.split('//')[1].split('@')[0].split(':');
      await page.authenticate({ username, password });
    }

    // Set random user-agent
    await page.setUserAgent(getRandomUserAgent());

    // Navigate to Bing search URL
    const searchUrl = `${env.BING_SEARCH_URL}${encodeURIComponent(keywordRecord.text)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    // Extract HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    // Basic parsing
    const totalAds = $('.sb_add, .ads').length; // Count elements with class 'sb_add' or 'ads'
    const totalLinks = $('a').length; // Count all <a> tags on the page

    // Update keyword status and save scrape attempt within a transaction
    await prisma.$transaction(async (tx) => {
      await tx.keyword.update({
        where: { id: keywordId },
        data: { status: 'COMPLETED' },
      });

      await tx.scrapeAttempt.create({
        data: {
          keywordId: keywordId,
          html,
          adCount: totalAds,
          linkCount: totalLinks,
          status: 'SUCCESS',
        },
      });
    });

    console.log(`Finished job ${job.id} for keyword ${keywordId}. Ads: ${totalAds}, Links: ${totalLinks}`);
  } catch (error: any) {
    console.error(`Job ${job.id} for keyword ${keywordId} failed:`, error);

    if (job.attemptsMade + 1 >= job.opts.attempts) { // Check if all retries are exhausted
      console.log(`Job ${job?.id} for keyword ${job.data.keywordId} permanently failed after ${job.attemptsMade + 1} attempts.`);

      await prisma.$transaction(async (tx) => {
        await tx.keyword.update({
          where: { id: keywordId },
          data: { status: 'FAILED' },
        });

        await tx.scrapeAttempt.create({
          data: {
            keywordId: keywordId,
            html: '',
            adCount: 0,
            linkCount: 0,
            status: 'FAILED',
            error: error.message,
          },
        });
      });
    }
    else {
      console.log(`Job ${job.id} for keyword ${job.data.keywordId} failed. Retrying...`);

      await prisma.$transaction(async (tx) => {
        await tx.keyword.update({
          where: { id: keywordId },
          data: { status: 'PENDING' },
        });

        await tx.scrapeAttempt.create({
          data: {
            keywordId: keywordId,
            html: '',
            adCount: 0,
            linkCount: 0,
            status: 'FAILED',
            error: error.message,
          },
        });
      });
    }

    throw error; // Re-throw to mark job as failed in BullMQ
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

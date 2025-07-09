import { Browser, Page } from 'puppeteer';
import { initializeBrowser, newPage } from '../lib/browser';
import { SearchEngine } from './search-engines/search-engine.interface';
import { HtmlParsingStrategy } from './html-parsers/html-parser.interface';
import prisma from '../lib/prisma';
import { notiQueue } from '../lib/noti.queue';

export class Scraper {
  constructor(
    private searchEngine: SearchEngine,
    private htmlParser: HtmlParsingStrategy
  ) {}

  async run(job: any) {
    const { keywordId, notiId } = job.data;
    console.log(`Processing job ${job.id} for keyword ${keywordId}`);

    const keywordRecord = await prisma.keyword.findUnique({
      where: { id: keywordId },
    });

    if (!keywordRecord) {
      console.error(`Keyword with ID ${keywordId} not found.`);
      throw new Error(`Keyword with ID ${keywordId} not found.`);
    }

    await this.updateKeywordAndSaveScrapeAttempt(
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
      browser = await initializeBrowser();
      page = await newPage(browser);
      console.log('Browser launched and page created');

      const searchUrl = this.searchEngine.getSearchUrl(keywordRecord.text);
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      const html = await page.content();
      console.log('Navigated to search URL and got HTML');

      const { totalAds, totalLinks } = this.htmlParser.parse(html);

      const scrapeAttempt = await this.updateKeywordAndSaveScrapeAttempt(
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
      await this.handleScrapeFailure(job, keywordId, error, notiId);
    } finally {
      await page?.close({ runBeforeUnload: false });
      console.log('Page closed');

      await browser?.close();
      console.log('Browser closed');
    }

    console.log('Job completed');
  }

  private async updateKeywordAndSaveScrapeAttempt(
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

  private async handleScrapeFailure(job: any, keywordId: string, error: any, notiId: string) {
    console.error(`Job ${job.id} for keyword ${keywordId} failed:`, error);

    let status: 'PENDING' | 'FAILED';
    if (job.attemptsMade + 1 >= job.opts.attempts) {
      console.log(`Job ${job?.id} for keyword ${job.data.keywordId} permanently failed after ${job.attemptsMade + 1} attempts.`);
      status = 'FAILED';
    } else {
      console.log(`Job ${job.id} for keyword ${job.data.keywordId} failed. Retrying...`);
      status = 'PENDING';
    }

    const scrapeAttempt = await this.updateKeywordAndSaveScrapeAttempt(
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
}

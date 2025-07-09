import { Scraper } from '@server/scrapers/scraper';
import { SearchEngine } from '@server/scrapers/search-engines/search-engine.interface';
import { HtmlParsingStrategy } from '@server/scrapers/html-parsers/html-parser.interface';
import prisma from '@server/lib/prisma';
import { notiQueue } from '@server/lib/noti.queue';
import { initializeBrowser, newPage } from '@server/lib/browser';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    keyword: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    scrapeAttempt: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      await callback(prisma);
    }),
  },
}));

jest.mock('../../lib/noti.queue', () => ({
  notiQueue: {
    add: jest.fn(),
  },
}));

jest.mock('../../lib/browser', () => ({
  initializeBrowser: jest.fn(),
  newPage: jest.fn(),
}));

class MockSearchEngine implements SearchEngine {
  getSearchUrl(keyword: string): string {
    return `https://example.com/search?q=${keyword}`;
  }
}

class MockHtmlParser implements HtmlParsingStrategy {
  parse(html: string): { totalAds: number; totalLinks: number } {
    return { totalAds: 2, totalLinks: 10 };
  }
}

describe('ScraperWorker', () => {
  let scraperWorker: Scraper;
  let mockSearchEngine: SearchEngine;
  let mockHtmlParser: HtmlParsingStrategy;

  beforeEach(() => {
    mockSearchEngine = new MockSearchEngine();
    mockHtmlParser = new MockHtmlParser();
    scraperWorker = new Scraper(mockSearchEngine, mockHtmlParser);

    (prisma.keyword.findUnique as jest.Mock).mockResolvedValue({
      id: 'testKeywordId',
      text: 'test keyword',
    });

    (prisma.scrapeAttempt.create as jest.Mock).mockResolvedValue({});

    (initializeBrowser as jest.Mock).mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn(),
        content: jest.fn().mockResolvedValue('<html></html>'),
        close: jest.fn(),
      }),
      close: jest.fn(),
    });
    
    (newPage as jest.Mock).mockResolvedValue({
        goto: jest.fn(),
        content: jest.fn().mockResolvedValue('<html></html>'),
        close: jest.fn(),
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process a job successfully', async () => {
    const job = {
      id: 'testJobId',
      data: { keywordId: 'testKeywordId', notiId: 'testNotiId' },
      opts: { attempts: 1 },
      attemptsMade: 0,
    };

    await scraperWorker.run(job);

    expect(prisma.keyword.findUnique).toHaveBeenCalledWith({ where: { id: 'testKeywordId' } });
    expect(prisma.keyword.update).toHaveBeenCalledWith({ where: { id: 'testKeywordId' }, data: { status: 'IN_PROGRESS' } });
    expect(notiQueue.add).toHaveBeenCalledWith('noti', expect.any(Object));
    expect(initializeBrowser).toHaveBeenCalled();
    expect(newPage).toHaveBeenCalled();
    expect(prisma.scrapeAttempt.create).toHaveBeenCalled();
    expect(prisma.keyword.update).toHaveBeenCalledWith({ where: { id: 'testKeywordId' }, data: { status: 'COMPLETED' } });
  });
});

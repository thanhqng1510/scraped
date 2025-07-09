import { initializeBrowser, newPage } from '@server/lib/browser';
import puppeteer from 'puppeteer-extra';
import { getRandomProxy } from '@server/scrapers/services/proxy.service';
import { getRandomUserAgent } from '@server/scrapers/services/user-agent.service';

jest.mock('puppeteer-extra', () => ({
  use: jest.fn(),
  launch: jest.fn(() =>
    Promise.resolve({
      newPage: jest.fn(() =>
        Promise.resolve({
          setDefaultTimeout: jest.fn(),
          setDefaultNavigationTimeout: jest.fn(),
          authenticate: jest.fn(),
          setUserAgent: jest.fn(),
        })
      ),
      close: jest.fn(),
    })
  ),
}));

jest.mock('@server/scrapers/services/proxy.service', () => ({
  loadProxies: jest.fn(),
  getRandomProxy: jest.fn(),
}));

jest.mock('@server/scrapers/services/user-agent.service', () => ({
  getRandomUserAgent: jest.fn(),
}));

describe('browser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeBrowser', () => {
    it('should launch a new browser instance with default arguments', async () => {
      (getRandomProxy as jest.Mock).mockReturnValue(null);

      const browser = await initializeBrowser();
      expect(puppeteer.launch).toHaveBeenCalledWith({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        headless: 'new',
      });

      expect(browser).toBeDefined();
    });

    it('should launch a new browser instance with proxy arguments if a proxy is available', async () => {
      (getRandomProxy as jest.Mock).mockReturnValue('http://user:pass@127.0.0.1:8080');

      const browser = await initializeBrowser();
      expect(puppeteer.launch).toHaveBeenCalledWith({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--proxy-server=127.0.0.1:8080',
        ],
        headless: 'new',
      });

      expect(browser).toBeDefined();
    });
  });

  describe('newPage', () => {
    it('should create a new page and set default timeouts and user agent', async () => {
      const mockBrowser = await puppeteer.launch();

      (getRandomProxy as jest.Mock).mockReturnValue(null);
      (getRandomUserAgent as jest.Mock).mockReturnValue('test-user-agent');

      const page = await newPage(mockBrowser);

      expect(page.setDefaultTimeout).toHaveBeenCalledWith(30000);
      expect(page.setDefaultNavigationTimeout).toHaveBeenCalledWith(30000);
      expect(page.setUserAgent).toHaveBeenCalledWith('test-user-agent');
      expect(page.authenticate).not.toHaveBeenCalled();
    });

    it('should authenticate the page if a proxy with credentials is provided', async () => {
      const mockBrowser = await puppeteer.launch();

      (getRandomProxy as jest.Mock).mockReturnValue('http://user:pass@127.0.0.1:8080');
      (getRandomUserAgent as jest.Mock).mockReturnValue('test-user-agent');

      const page = await newPage(mockBrowser);

      expect(page.authenticate).toHaveBeenCalledWith({
        username: 'user',
        password: 'pass',
      });
    });
  });
});

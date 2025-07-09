
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { loadProxies, getRandomProxy } from '../scrapers/services/proxy.service';
import { getRandomUserAgent } from '../scrapers/services/user-agent.service';

loadProxies();
puppeteer.use(StealthPlugin());

export const initializeBrowser = async (): Promise<Browser> => {
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
  return browser;
};

export const newPage = async (browser: Browser): Promise<Page> => {
  const page = await browser.newPage();

  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);

  const proxy = getRandomProxy();
  if (proxy && proxy.includes('@')) {
    const [username, password] = proxy.split('//')[1].split('@')[0].split(':');
    await page.authenticate({ username, password });
  }

  await page.setUserAgent(getRandomUserAgent());

  return page;
};

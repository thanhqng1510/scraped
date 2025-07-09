import { BingSearchEngine } from '@server/scrapers/search-engines/bing-search-engine';

describe('BingSearchEngine', () => {
  let bingSearchEngine: BingSearchEngine;

  beforeEach(() => {
    bingSearchEngine = new BingSearchEngine();
  });

  it('should generate a valid Bing search URL', () => {
    const keyword = 'test keyword';
    const expectedUrl = `https://www.bing.com/search?q=test%20keyword`;

    const url = bingSearchEngine.getSearchUrl(keyword);

    expect(url).toBe(expectedUrl);
  });

  it('should correctly encode special characters in the keyword', () => {
    const keyword = 'a&b=c';
    const expectedUrl = `https://www.bing.com/search?q=a%26b%3Dc`;

    const url = bingSearchEngine.getSearchUrl(keyword);

    expect(url).toBe(expectedUrl);
  });
});

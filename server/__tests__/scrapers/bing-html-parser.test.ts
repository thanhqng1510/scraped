import { BingHtmlParser } from '@server/scrapers/html-parsers/bing-html-parser';

describe('BingHtmlParser', () => {
  let bingHtmlParser: BingHtmlParser;

  beforeEach(() => {
    bingHtmlParser = new BingHtmlParser();
  });

  it('should correctly parse HTML and count ads and links with new selectors', () => {
    const html = `
      <div>
        <li class="b_ad">Ad 1</li>
        <div class="sb_add">Ad 2</div>
        <a href="#">Link 1</a>
        <a href="#">Link 2</a>
        <div data-bm="some-data">Not an ad</div>
        <a href="#">Link 3</a>
      </div>
    `;

    const result = bingHtmlParser.parse(html);

    expect(result.totalAds).toBe(2); // Should count li.b_ad and div.sb_add
    expect(result.totalLinks).toBe(3);
  });

  it('should return 0 for ads and links if none are found', () => {
    const html = '<div><p>No ads or links here.</p></div>';

    const result = bingHtmlParser.parse(html);

    expect(result.totalAds).toBe(0);
    expect(result.totalLinks).toBe(0);
  });

  it('should handle empty HTML gracefully', () => {
    const html = '';

    const result = bingHtmlParser.parse(html);

    expect(result.totalAds).toBe(0);
    expect(result.totalLinks).toBe(0);
  });

  it('should count an element with both classes only once', () => {
    const html = `
      <div>
        <li class="b_ad sb_add">Ad with both classes</li>
        <a href="#">Link 1</a>
      </div>
    `;

    const result = bingHtmlParser.parse(html);

    expect(result.totalAds).toBe(1);
    expect(result.totalLinks).toBe(1);
  });

  it('should count only the top-level ad in a parent-child relationship', () => {
    const html = `
      <div class="sb_add">
        Parent Ad
        <li class="b_ad">Child Ad</li>
      </div>
      <li class="b_ad">Another top-level Ad</li>
    `;

    const result = bingHtmlParser.parse(html);

    expect(result.totalAds).toBe(2); // div.sb_add and the second li.b_ad
    expect(result.totalLinks).toBe(0);
  });

  it('should count only the top-level ad in multi-level nesting', () => {
    const html = `
      <div class="sb_add">
        Level 1 Ad
        <div>
          <span>
            <li class="b_ad">Level 2 Ad</li>
          </span>
        </div>
      </div>
      <div class="some-other-div">
        <div class="sb_add">
          Level 1 Ad in other div
          <li class="b_ad">Level 2 Ad in other div</li>
        </div>
      </div>
    `;

    const result = bingHtmlParser.parse(html);

    expect(result.totalAds).toBe(2); // The two outermost .sb_add divs
    expect(result.totalLinks).toBe(0);
  });
});
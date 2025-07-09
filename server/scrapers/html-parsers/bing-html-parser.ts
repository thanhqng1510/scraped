import { HtmlParsingStrategy } from './html-parser.interface';
import * as cheerio from 'cheerio';

export class BingHtmlParser implements HtmlParsingStrategy {
  parse(html: string) {
    const $ = cheerio.load(html);
    const adSelector = '.b_ad, .sb_add';
    const $ads = $(adSelector);

    const totalAds = $ads.filter((_, element) => {
      return $(element).parents(adSelector).length === 0;
    }).length;

    const totalLinks = $('a').length;
    return { totalAds, totalLinks };
  }
}

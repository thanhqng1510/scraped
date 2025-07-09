import { HtmlParsingStrategy } from './html-parser.interface';
import * as cheerio from 'cheerio';

export class BingHtmlParser implements HtmlParsingStrategy {
  parse(html: string) {
    const $ = cheerio.load(html);
    const totalAds = $('.sb_add, .ads, .b_ad, [data-bm]').length;
    const totalLinks = $('a').length;
    return { totalAds, totalLinks };
  }
}

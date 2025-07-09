export interface HtmlParsingStrategy {
  parse(html: string): { totalAds: number; totalLinks: number };
}

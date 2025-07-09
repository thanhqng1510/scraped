import { SearchEngine } from './search-engine.interface';
import { env } from '../../env';

export class BingSearchEngine implements SearchEngine {
  getSearchUrl(keyword: string): string {
    return `https://www.bing.com/search?q=${encodeURIComponent(keyword)}`;
  }
}

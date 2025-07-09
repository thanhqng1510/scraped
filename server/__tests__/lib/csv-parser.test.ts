import { parseKeywordsFromCsv } from '@server/lib/csv-parser';

describe('parseKeywordsFromCsv', () => {
  it('should parse a valid CSV buffer and return keywords', async () => {
    const csvData = 'keyword\nkey1\nkey2\nkey3';
    const buffer = Buffer.from(csvData);

    const keywords = await parseKeywordsFromCsv(buffer, 100);

    expect(keywords).toEqual(['key1', 'key2', 'key3']);
  });

  it('should reject if no keywords are found in the CSV', async () => {
    const csvData = 'header\nvalue1\nvalue2';
    const buffer = Buffer.from(csvData);

    await expect(parseKeywordsFromCsv(buffer, 100)).rejects.toThrow('No keywords found in the CSV file.');
  });

  it('should reject if the CSV contains more keywords than the max limit', async () => {
    const keywords = Array.from({ length: 101 }, (_, i) => `key${i + 1}`);
    const csvData = `keyword\n${keywords.join('\n')}`;
    const buffer = Buffer.from(csvData);

    await expect(parseKeywordsFromCsv(buffer, 100)).rejects.toThrow('CSV file contains too many keywords. Maximum allowed is 100.');
  });

  it('should handle an empty CSV file', async () => {
    const csvData = '';
    const buffer = Buffer.from(csvData);

    await expect(parseKeywordsFromCsv(buffer, 100)).rejects.toThrow('No keywords found in the CSV file.');
  });

  it('should handle a CSV with only a header', async () => {
    const csvData = 'keyword';
    const buffer = Buffer.from(csvData);

    await expect(parseKeywordsFromCsv(buffer, 100)).rejects.toThrow('No keywords found in the CSV file.');
  });
});


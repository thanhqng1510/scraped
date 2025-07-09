import csv from 'csv-parser';
import { Readable } from 'stream';

export const parseKeywordsFromCsv = (buffer: Buffer, max: number): Promise<string[]> => {
  const bufferStream = new Readable();
  bufferStream.push(buffer);
  bufferStream.push(null);

  const keywords: string[] = [];

  return new Promise<string[]>((resolve, reject) => {
    bufferStream
      .pipe(csv())
      .on('data', (row) => {
        if (row.keyword) {
          if (keywords.length >= max) {
            return reject(new Error(`CSV file contains too many keywords. Maximum allowed is ${max}.`));
          }
          keywords.push(row.keyword);
        }
      })
      .on('end', () => {
        if (keywords.length === 0) {
          return reject(new Error('No keywords found in the CSV file.'));
        }
        resolve(keywords);
      })
      .on('error', reject);
  });
};

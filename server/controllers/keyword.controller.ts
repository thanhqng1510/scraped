import { Request, Response } from 'express';
import csv from 'csv-parser';
import { Readable } from 'stream';
import prisma from '../lib/prisma';
import { enqueueScrapingJobs } from '../services/job.service';

export const uploadKeywordsCtrl = async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).send('No file uploaded.');
    return;
  }

  const bufferStream = new Readable();
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);
  const keywords: string[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      bufferStream
        .pipe(csv())
        .on('data', (row) => {
          // Assuming the CSV has a header like 'keyword'
          if (row.keyword) {
            keywords.push(row.keyword);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (keywords.length === 0) {
      res.status(400).send('No keywords found in the CSV file.');
      return;
    }

    if (keywords.length > 100) {
      res.status(400).send('CSV file contains too many keywords. Maximum allowed is 100.');
      return;
    }

    // Associate keywords with the authenticated user
    const userId = req.user?.id; // Assuming req.user is populated by authMiddleware
    if (!userId) {
      res.status(401).send('Unauthorized: User not found.');
      return;
    }

    const createdKeywords = await prisma.keyword.createManyAndReturn({
      data: keywords.map((keyword) => ({
        text: keyword,
        userId: userId,
      })),
      select: {
        id: true,
      },
    });

    res.status(202).json({ message: 'Keywords accepted for processing', count: createdKeywords.length });

    // Enqueue jobs in the background without awaiting to prevent request timeouts
    enqueueScrapingJobs(createdKeywords.map(k => k.id));
  } catch (error) {
    console.error('Error uploading keywords:', error);
    res.status(500).send('Error processing CSV file.');
  }
};
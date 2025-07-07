import { Request, Response } from 'express';
import csv from 'csv-parser';
import { Readable } from 'stream';
import prisma from '../lib/prisma';
import { enqueueScrapingJobs } from '../lib/scrape.queue';

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
    const uid = req.uid;
    if (!uid) {
      res.status(401).send('Unauthorized: User not found.');
      return;
    }

    const createdKeywords = await prisma.keyword.createManyAndReturn({
      data: keywords.map((keyword) => ({
        text: keyword,
        userId: uid,
      })),
      select: {
        id: true,
      },
    });

    res.status(202).json({ message: 'Keywords accepted for processing', count: createdKeywords.length });

    // Enqueue jobs in the background without awaiting to prevent request timeouts
    enqueueScrapingJobs(createdKeywords.map((k: { id: string }) => k.id), req.uid!);
  } catch (error) {
    console.error('Error processing CSV file.', error);
    res.status(500).send('Error processing CSV file.');
  }
};

export const getKeywordsCtrl = async (req: Request, res: Response) => {
  try {
    const uid = req.uid;
    if (!uid) {
      res.status(401).send('Unauthorized: User not found.');
      return;
    }

    let page = parseInt(req.query.page as string) || 1;
    page = Math.max(page, 1);

    let limit = parseInt(req.query.limit as string) || 20;
    limit = Math.max(limit, 1);
    limit = Math.min(limit, 20);

    const skip = (page - 1) * limit;

    const whereClause: any = { userId: uid };
    const search = req.query.search as string;
    if (search) {
      // Format for tsquery: treat spaces as OR operator for full-text search
      const formattedSearch = search.trim().split(/\s+/).join(' | ');
      whereClause.OR = [
        {
          text: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          scrapeAttempts: {
            some: {
              html: {
                search: formattedSearch,
              },
            },
          },
        },
      ];
    }

    const [totalKeywords, keywords] = await prisma.$transaction([
      prisma.keyword.count({
        where: whereClause,
      }),
      prisma.keyword.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        orderBy: [
          { createdAt: 'desc' },
          { text: 'asc' },
        ],
      }),
    ]);

    res.status(200).json({
      data: keywords,
      pagination: {
        total: totalKeywords,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalKeywords / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).send('Error fetching keywords.');
  }
};

export const getKeywordDetailsCtrl = async (req: Request, res: Response) => {
  try {
    const uid = req.uid;
    if (!uid) {
      res.status(401).send('Unauthorized: User not found.');
      return;
    }

    const keywordId = req.params.id;
    if (!keywordId) {
      res.status(400).send('Invalid keyword ID.');
      return;
    }

    const keyword = await prisma.keyword.findUnique({
      where: { id: keywordId, userId: uid },
      include: {
        scrapeAttempts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!keyword) {
      res.status(404).send('Keyword not found or not authorized.');
      return;
    }

    res.status(200).json(keyword);
  } catch (error) {
    console.error('Error fetching keyword details:', error);
    res.status(500).send('Error fetching keyword details.');
  }
};
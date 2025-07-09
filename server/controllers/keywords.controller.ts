import { Request, Response } from 'express';
import { parseKeywordsFromCsv } from '../lib/csv-parser';
import prisma from '../lib/prisma';
import { enqueueScrapingJobs } from '../lib/scrape.queue';

export const uploadKeywordsCtrl = async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).send('No file uploaded.');
    return;
  }

  try {
    const MAX_KEYWORDS = 100;
    const keywords = await parseKeywordsFromCsv(req.file.buffer, MAX_KEYWORDS);

    // Associate keywords with the authenticated user
    const uid = req.uid!;

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
    const uid = req.uid!;

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
    const uid = req.uid!;

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
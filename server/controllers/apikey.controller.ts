import { Response, Request } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';

export const getApiKeysCtrl = async (req: Request, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.uid! },
      select: { 
        id: true,
        name: true,
        key: true,
        createdAt: true,
        expiresAt: true 
      },
      orderBy: { createdAt: 'desc' },
    });

    // Return partial keys for security
    keys.forEach(k => {
      k.key = `${k.key.substring(0, 8)}...${k.key.substring(k.key.length - 4)}`
    });

    res.status(200).json(keys);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve API keys.' });
  }
};

export const createApiKeyCtrl = async (req: Request, res: Response) => {
  const { name, expiresInDays } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ message: 'API key name is required.' });
    return;
  }

  let expiresAt: Date | null = null;
  if (expiresInDays) {
    if (typeof expiresInDays !== 'number' || expiresInDays <= 0) {
      res.status(400).json({ message: 'expiresInDays must be a positive number.' });
      return;
    }

    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }
  
  try {
    const newKey = `sk_${crypto.randomBytes(24).toString('hex')}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        key: newKey,
        userId: req.uid!,
        expiresAt: expiresAt,
      },
    });

    res.status(201).json({ key: apiKey.key });
  } catch (error) {
    console.error('Failed to create API key:', error);
    res.status(500).json({ message: 'Failed to create API key.' });
  }
};

export const revokeApiKeyCtrl = async (req: Request, res: Response) => {
  try {
    await prisma.apiKey.updateMany({
      where: { id: req.params.id, userId: req.uid! },
      data: { expiresAt: new Date() },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Failed to revoke API key.' });
  }
};
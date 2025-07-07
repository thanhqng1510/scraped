import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import prisma from '../lib/prisma';

// Helper function to handle Bearer token authentication
function handleBearerAuth(token: string): string | undefined {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { uid: string };
    return decoded.uid;
  }
  catch(err) {
    console.error('Bearer authentication failed:', err)
  }
}

// Helper function to handle API Key authentication
async function handleApiKeyAuth(token: string): Promise<string | undefined> {
  const apiKey = await prisma.apiKey.findUnique({
    where: {
      key: token
    },
    select: { userId: true, expiresAt: true },
  });

  const isKeyValid = apiKey && (!apiKey.expiresAt || new Date(apiKey.expiresAt) > new Date());
  if (isKeyValid) {
    return apiKey.userId;
  }

  console.error('API Key authentication failed:', token);
  return undefined;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: 'Authorization header is missing.' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  try {
    let uid: string | undefined;

    if (scheme === 'Bearer' && token) {
      uid = handleBearerAuth(token);
    } else if (scheme === 'Api-Key' && token) {
      uid = await handleApiKeyAuth(token);
    } else {
      res.status(401).json({ message: 'Unsupported or malformed authorization scheme.' });
      return
    }

    if (!uid) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    req.uid = uid;
    next();
  } catch (error) {
    // This will catch errors like an invalid JWT signature
    res.status(401).json({ message: 'Authentication failed: Invalid token.' });
    return;
  }
};
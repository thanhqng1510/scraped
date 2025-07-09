import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { env } from '../../env';

jest.mock('../../env', () => ({
  env: {
    JWT_SECRET: 'supersecretjwtkey',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    DATABASE_URL: 'postgresql://user:password@host:port/database',
    PORT: 3000,
    NODE_ENV: 'test',
    BING_SEARCH_URL: 'https://www.bing.com/search?q=',
  },
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token: string, secret: string) => {
    if (token === 'validJwtToken' && secret === env.JWT_SECRET) {
      return { uid: 'testUserId' };
    }
    throw new Error('Invalid token');
  }),
}));

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    apiKey: {
      findUnique: jest.fn(),
    },
  },
}));

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = { headers: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if no authorization header is provided', async () => {
    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authorization header is missing.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 for an unsupported authorization scheme', async () => {
    mockRequest.headers!.authorization = 'Basic someToken';

    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unsupported or malformed authorization scheme.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  describe('Bearer Token', () => {
    it('should set req.uid and call next for a valid JWT', async () => {
      // jwt.verify is mocked globally, so no need to mock here
      mockRequest.headers!.authorization = 'Bearer validJwtToken';

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(jwt.verify).toHaveBeenCalledWith('validJwtToken', env.JWT_SECRET);
      expect(mockRequest.uid).toBe('testUserId');
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 for an invalid JWT', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      mockRequest.headers!.authorization = 'Bearer invalidJwtToken';

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(jwt.verify).toHaveBeenCalledWith('invalidJwtToken', env.JWT_SECRET);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authentication failed: Invalid token.' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('API-Key', () => {
    it('should set req.uid and call next for a valid API Key', async () => {
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        userId: 'testUserId',
        expiresAt: null,
      });
      mockRequest.headers!.authorization = 'Api-Key validApiKey';

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { key: 'validApiKey' },
        select: { userId: true, expiresAt: true },
      });
      expect(mockRequest.uid).toBe('testUserId');
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 for an invalid API Key', async () => {
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);
      mockRequest.headers!.authorization = 'Api-Key invalidApiKey';

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { key: 'invalidApiKey' },
        select: { userId: true, expiresAt: true },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authentication failed: Invalid token.' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for an expired API Key', async () => {
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        userId: 'testUserId',
        expiresAt: new Date(Date.now() - 100000), // Expired 100 seconds ago
      });
      mockRequest.headers!.authorization = 'Api-Key expiredApiKey';

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { key: 'expiredApiKey' },
        select: { userId: true, expiresAt: true },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authentication failed: Invalid token.' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 500 if a database error occurs during API Key validation', async () => {
      (prisma.apiKey.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));
      mockRequest.headers!.authorization = 'Api-Key someApiKey';

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authentication failed: Invalid token.' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
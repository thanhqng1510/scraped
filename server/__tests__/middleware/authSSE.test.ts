import { Request, Response, NextFunction } from 'express';
import { authSSEMiddleware } from '../../middleware/authSSE.middleware';
import jwt from 'jsonwebtoken';
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

jest.mock('jsonwebtoken');

describe('authSSEMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = { query: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if no token is provided', () => {
    authSSEMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized: No token provided.');
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should set req.uid and call next for a valid token', () => {
    (jwt.verify as jest.Mock).mockReturnValue({ uid: 'testUserId' });
    mockRequest.query = { token: 'validToken' };

    authSSEMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(jwt.verify).toHaveBeenCalledWith('validToken', env.JWT_SECRET);
    expect(mockRequest.uid).toBe('testUserId');
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 403 for an invalid token', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });
    mockRequest.query = { token: 'invalidToken' };

    authSSEMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(jwt.verify).toHaveBeenCalledWith('invalidToken', env.JWT_SECRET);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized: Invalid token.');
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
// This prevents multiple instances of Prisma Client in development

import { PrismaClient } from '@prisma/client';

declare const global: {
  prisma: PrismaClient | undefined;
};

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

export const createPrismaClient = (): PrismaClient => {
  return new PrismaClient();
};

import { PrismaClient } from './generated/client';

export * from './generated/client';
import { PrismaPg } from "@prisma/adapter-pg";

export const createPrismaClient = (): PrismaClient => {
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    });
    return new PrismaClient({ adapter });
};

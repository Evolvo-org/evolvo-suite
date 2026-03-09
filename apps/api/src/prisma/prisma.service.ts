import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@repo/db/client';
import { PrismaPg } from '@prisma/adapter-pg';

import type { ApplicationEnvironment } from '../config/environment.js';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(
    @Inject(ConfigService)
    configService: ConfigService<ApplicationEnvironment, true>,
  ) {
    const databaseUrl = configService.get('databaseUrl', { infer: true });
    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    super({ adapter });
  }
}

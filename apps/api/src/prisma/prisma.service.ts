import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@repo/db';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

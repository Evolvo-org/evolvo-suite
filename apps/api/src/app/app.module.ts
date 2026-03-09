import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DevelopmentPlansModule } from '../development-plans/development-plans.module';
import { validateEnvironment } from '../config/environment';
import { HealthModule } from '../health/health.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductSpecsModule } from '../product-specs/product-specs.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    HealthModule,
    ProjectsModule,
    ProductSpecsModule,
    DevelopmentPlansModule,
  ],
})
export class AppModule {}

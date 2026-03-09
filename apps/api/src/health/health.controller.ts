import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApplicationEnvironment } from '../config/environment.js';

@Controller('health')
export class HealthController {
  public constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<ApplicationEnvironment, true>,
  ) {}

  @Get()
  public getHealth() {
    return {
      status: 'ok',
      environment: this.configService.get('nodeEnv', { infer: true }),
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}

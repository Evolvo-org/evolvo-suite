import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { describe, it, beforeEach, expect } from 'vitest';
import request from 'supertest';
import { AppModule } from './../src/app/app.module';
import { configureApiApp } from './../src/bootstrap/main';
import { ConfigService } from '@nestjs/config';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApiApp(app, app.get(ConfigService));
    await app.init();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('ok');
      });
  });

  it('/api/v1/projects/repository/validate (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/projects/repository/validate')
      .send({
        provider: 'github',
        owner: 'Evolvo-org',
        name: 'evolvo-suite',
        url: 'https://github.com/Evolvo-org/evolvo-suite.git',
        defaultBranch: 'main',
        baseBranch: 'main',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.isValid).toBe(true);
        expect(response.body.normalizedUrl).toBe(
          'https://github.com/Evolvo-org/evolvo-suite',
        );
        expect(response.body.warnings).toContain(
          'Repository URL was normalized to remove the trailing .git suffix.',
        );
      });
  });
});

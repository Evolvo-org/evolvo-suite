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

  it('/api/v1/projects/:projectId/planning/hierarchy (GET/POST)', async () => {
    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Planning Hierarchy Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription:
          'Validation fixture for the planning hierarchy endpoints.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({
        title: 'Epic from e2e',
        summary: 'Ensure the planning hierarchy endpoint persists epics.',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.epics).toHaveLength(1);
        expect(response.body.data.epics[0].title).toBe('Epic from e2e');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/planning/hierarchy`)
      .expect(200)
      .expect((response) => {
        expect(response.body.projectId).toBe(projectId);
        expect(response.body.epics).toHaveLength(1);
        expect(response.body.workItemCount).toBe(0);
      });
  });

  it('/api/v1/projects/:projectId/board (GET/POST transition)', async () => {
    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Workflow Board Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription:
          'Validation fixture for board transitions and counts.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({
        title: 'Board epic',
      })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Flow through board',
      })
      .expect(201);

    const taskId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/board`)
      .expect(200)
      .expect((response) => {
        expect(response.body.counts.inbox).toBe(1);
        expect(response.body.columns[0].items[0].id).toBe(taskId);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${taskId}/transition`)
      .send({
        toState: 'planning',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.counts.planning).toBe(1);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${taskId}/transition`)
      .send({
        toState: 'released',
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('Invalid workflow transition.');
      });
  });
});

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

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${taskId}/comments`)
      .send({
        content: 'Agent review noted one remaining edge case.',
        actorType: 'agent',
        actorName: 'Review agent',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.items).toHaveLength(1);
        expect(response.body.data.items[0].actorType).toBe('agent');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${taskId}/audit`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items.length).toBeGreaterThanOrEqual(2);
        expect(
          response.body.items.some((item: { type: string }) => item.type === 'comment'),
        ).toBe(true);
        expect(
          response.body.items.some(
            (item: { type: string }) => item.type === 'transition',
          ),
        ).toBe(true);
      });
  });

  it('/api/v1/settings/queue-limits/defaults and /projects/:projectId/queue-limits', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/settings/queue-limits/defaults')
      .expect(200)
      .expect((response) => {
        expect(response.body.queueLimits.maxInDev).toBeGreaterThan(0);
        expect(response.body.updatedAt).toBeNull();
      });

    const updateDefaultsResponse = await request(app.getHttpServer())
      .put('/api/v1/settings/queue-limits/defaults')
      .send({
        maxPlanning: 15,
        maxReadyForDev: 10,
        maxInDev: 4,
        maxReadyForReview: 4,
        maxInReview: 2,
        maxReadyForRelease: 2,
        maxReviewRetries: 4,
        maxMergeConflictRetries: 2,
        maxRuntimeRetries: 5,
        maxAmbiguityRetries: 3,
      })
      .expect(200);

    expect(updateDefaultsResponse.body.data.queueLimits.maxPlanning).toBe(15);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Queue Limits Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription:
          'Validation fixture for queue limit defaults and project overrides.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/queue-limits`)
      .expect(200)
      .expect((response) => {
        expect(response.body.projectId).toBe(projectId);
        expect(response.body.overrides).toBeNull();
        expect(response.body.effective.maxPlanning).toBe(15);
      });

    await request(app.getHttpServer())
      .put(`/api/v1/projects/${projectId}/queue-limits`)
      .send({
        maxPlanning: 8,
        maxReadyForDev: 9,
        maxInDev: 2,
        maxReadyForReview: 2,
        maxInReview: 1,
        maxReadyForRelease: 1,
        maxReviewRetries: 2,
        maxMergeConflictRetries: 1,
        maxRuntimeRetries: 2,
        maxAmbiguityRetries: 1,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.overrides.maxPlanning).toBe(8);
        expect(response.body.data.effective.maxPlanning).toBe(8);
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/queue-limits`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data.overrides).toBeNull();
        expect(response.body.data.effective.maxPlanning).toBe(15);
      });
  });
});

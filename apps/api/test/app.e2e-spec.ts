import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { describe, it, beforeEach, expect } from 'vitest';
import { io as createSocketClient } from 'socket.io-client';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './../src/app/app.module.js';
import { configureApiApp } from './../src/main.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const loginAs = async (role: 'admin' | 'operator' | 'reviewer' | 'viewer') => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        userId: `${role}-user`,
        displayName: `${role} user`,
        role,
        workspaceKey: 'default',
      })
      .expect(201);

    return `${response.body.data.tokenType} ${response.body.data.accessToken}`;
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApiApp(app, app.get(ConfigService));
    await app.init();
    prisma = app.get(PrismaService);
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('ok');
      });
  });

  it('/api/v1/auth login, current-user, and logout', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        userId: 'admin-user',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'admin',
        workspaceKey: 'default',
      })
      .expect(201);

    expect(loginResponse.body.data.tokenType).toBe('Bearer');
    expect(loginResponse.body.data.currentUser.role).toBe('admin');

    const authorization = `${loginResponse.body.data.tokenType} ${loginResponse.body.data.accessToken}`;

    await request(app.getHttpServer())
      .get('/api/v1/auth/current-user')
      .set('authorization', authorization)
      .expect(200)
      .expect((response) => {
        expect(response.body.userId).toBe('admin-user');
        expect(response.body.role).toBe('admin');
        expect(response.body.capabilities).toContain('billing:write');
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('authorization', authorization)
      .expect(201)
      .expect((response) => {
        expect(response.body.data.loggedOut).toBe(true);
      });
  });

  it('/api/v1/logs/system and /projects/:projectId/logs (GET)', async () => {
    const correlationId = `corr-${Date.now()}`;

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('x-correlation-id', correlationId)
      .send({
        name: `Logs Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for log queries.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    expect(createProjectResponse.headers['x-correlation-id']).toBe(correlationId);

    await request(app.getHttpServer())
      .get(`/api/v1/logs/system?correlationId=${correlationId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.totalCount).toBeGreaterThanOrEqual(2);
        expect(
          response.body.items.some(
            (item: { eventType: string }) => item.eventType === 'project.created',
          ),
        ).toBe(true);
        expect(
          response.body.items.some(
            (item: { eventType: string }) => item.eventType === 'request.completed',
          ),
        ).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/logs?eventType=project.created`)
      .expect(200)
      .expect((response) => {
        expect(response.body.projectId).toBe(projectId);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].eventType).toBe('project.created');
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

  it('/api/v1/projects lifecycle endpoints', async () => {
    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Project Lifecycle Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for project lifecycle endpoints.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/status`)
      .expect(200)
      .expect((response) => {
        expect(response.body.lifecycleStatus).toBe('draft');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(projectId);
        expect(response.body.lifecycleStatus).toBe('draft');
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/start`)
      .expect(201)
      .expect((response) => {
        expect(response.body.data.lifecycleStatus).toBe('active');
      });

    await request(app.getHttpServer())
      .get('/api/v1/projects?lifecycleStatus=active')
      .expect(200)
      .expect((response) => {
        expect(
          response.body.items.some((item: { id: string }) => item.id === projectId),
        ).toBe(true);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/stop`)
      .expect(201)
      .expect((response) => {
        expect(response.body.data.lifecycleStatus).toBe('paused');
      });
  });

  it('/api/v1/projects/:projectId/start triggers automation loops for active projects', async () => {
    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Automation Loop Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription:
          'Generate backlog ideas automatically and move them through planning, dev, review, and release.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/start`)
      .expect(201)
      .expect((response) => {
        expect(response.body.data.lifecycleStatus).toBe('active');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/board`)
      .expect(200)
      .expect((response) => {
        expect(
          response.body.counts.released +
            response.body.counts.readyForRelease +
            response.body.counts.readyForReview,
        ).toBeGreaterThan(0);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/usage/summary`)
      .expect(200)
      .expect((response) => {
        expect(response.body.totalEvents).toBeGreaterThanOrEqual(4);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/interventions`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(0);
      });
  });

  it('/api/v1/projects/:projectId/automation/run triggers the next eligible automation lane', async () => {
    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Manual Automation Run Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription:
          'Allow operators to trigger the next eligible automation lane on demand.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/start`)
      .expect(201);

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({
        title: 'Automation epic',
      })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Expand project plan into executable work',
      })
      .expect(201);

    const boardResponse = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/board`)
      .expect(200);

    const expectedLane = boardResponse.body.counts.readyForRelease
      ? 'release'
      : boardResponse.body.counts.readyForReview
        ? 'review'
        : boardResponse.body.counts.readyForDev
          ? 'dev'
          : 'planning';

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/automation/run`)
      .send({ maxActions: 1 })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.actions).toHaveLength(1);
        expect(response.body.data.actions[0].lane).toBe(expectedLane);
        expect(response.body.data.actions[0].workItemId).not.toBeNull();
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
        expect(response.body.counts.planning).toBe(1);
        expect(response.body.columns[0].items[0].id).toBe(taskId);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${taskId}/transition`)
      .send({
        toState: 'readyForDev',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.counts.readyForDev).toBe(1);
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
        expect(
          response.body.updatedAt === null ||
            typeof response.body.updatedAt === 'string',
        ).toBe(true);
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

  it('/api/v1/scheduler/leases/acquire, renew, and recover', async () => {
    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Scheduler Lease Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for scheduler lease handling.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/start`)
      .expect(201);

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({
        title: 'Scheduler epic',
      })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Lease ready task',
      })
      .expect(201);

    const taskId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${taskId}/transition`)
      .send({
        toState: 'planning',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${taskId}/transition`)
      .send({
        toState: 'readyForDev',
      })
      .expect(201);

    const acquireResponse = await request(app.getHttpServer())
      .post('/api/v1/scheduler/leases/acquire')
      .send({
        runtimeId: 'runtime-test-1',
        lanes: ['dev'],
        projectId,
      })
      .expect(201);

    expect(acquireResponse.body.data.lease.workItemId).toBe(taskId);
    expect(acquireResponse.body.data.lease.status).toBe('active');

    const leaseId = acquireResponse.body.data.lease.id as string;
    const leaseToken = acquireResponse.body.data.lease.leaseToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/scheduler/leases/${leaseId}/renew`)
      .send({
        runtimeId: 'runtime-test-1',
        leaseToken,
        leaseDurationSeconds: 300,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.id).toBe(leaseId);
        expect(response.body.data.status).toBe('active');
      });

    await prisma.workItemLease.update({
      where: { id: leaseId },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/scheduler/leases/recover')
      .send({})
      .expect(201)
      .expect((response) => {
        expect(response.body.data.recoveredCount).toBeGreaterThanOrEqual(1);
        expect(
          response.body.data.items.some(
            (item: { id: string; status: string }) =>
              item.id === leaseId && item.status === 'recovered',
          ),
        ).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${taskId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.state).toBe('readyForDev');
      });
  });

  it('/api/v1/runtimes/register, heartbeat, and detail', async () => {
    const runtimeId = `runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Local runtime',
        capabilities: ['git', 'leases', 'heartbeats'],
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.runtimeId).toBe(runtimeId);
        expect(response.body.data.connectionStatus).toBe('online');
      });

    await request(app.getHttpServer())
      .post(`/api/v1/runtimes/${runtimeId}/heartbeat`)
      .send({
        status: 'busy',
        activeJobSummary: 'Implementing a leased work item.',
        lastAction: 'Pulled latest changes from origin/main.',
        lastError: 'Transient git lock detected and cleared.',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.reportedStatus).toBe('busy');
        expect(response.body.data.activeJobSummary).toContain('leased work item');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/runtimes/${runtimeId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.runtimeId).toBe(runtimeId);
        expect(response.body.connectionStatus).toBe('online');
        expect(response.body.lastAction).toContain('Pulled latest changes');
      });

    await prisma.runtimeInstance.update({
      where: { id: runtimeId },
      data: {
        lastSeenAt: new Date(Date.now() - 5 * 60_000),
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/runtimes/${runtimeId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.connectionStatus).toBe('offline');
        expect(response.body.reportedStatus).toBe('busy');
      });
  });

  it('/api/v1/runtimes/:runtimeId/request-work with progress, result, and artifacts', async () => {
    const runtimeId = `dispatch-runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Dispatch runtime',
        capabilities: ['dispatch', 'artifacts'],
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Runtime Dispatch Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for runtime work dispatch.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/start`)
      .expect(201);

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({
        title: 'Dispatch epic',
      })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Dispatch ready task',
        description: 'Task to validate runtime work dispatch endpoints.',
      })
      .expect(201);

    const taskId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${taskId}/transition`)
      .send({ toState: 'planning' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${taskId}/transition`)
      .send({ toState: 'readyForDev' })
      .expect(201);

    const dispatchResponse = await request(app.getHttpServer())
      .post(`/api/v1/runtimes/${runtimeId}/request-work`)
      .send({
        lanes: ['dev'],
        projectId,
      })
      .expect(201);

    expect(dispatchResponse.body.data.lease.workItemId).toBe(taskId);
    expect(dispatchResponse.body.data.project.id).toBe(projectId);
    expect(dispatchResponse.body.data.workItem.title).toBe('Dispatch ready task');

    const leaseId = dispatchResponse.body.data.lease.id as string;
    const leaseToken = dispatchResponse.body.data.lease.leaseToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/runtimes/${runtimeId}/leases/${leaseId}/progress`)
      .send({
        leaseToken,
        activeJobSummary: 'Running implementation steps.',
        lastAction: 'Applied code changes locally.',
        progressPercent: 65,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.id).toBe(leaseId);
        expect(response.body.data.status).toBe('active');
      });

    await request(app.getHttpServer())
      .post(`/api/v1/runtimes/${runtimeId}/leases/${leaseId}/artifacts`)
      .send({
        leaseToken,
        artifactType: 'log',
        fileName: 'execution.log',
        contentType: 'text/plain',
        sizeBytes: 2048,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.leaseId).toBe(leaseId);
        expect(response.body.data.status).toBe('pending');
        expect(response.body.data.storageKey).toContain('execution.log');
      });

    await request(app.getHttpServer())
      .post(`/api/v1/runtimes/${runtimeId}/leases/${leaseId}/result`)
      .send({
        leaseToken,
        outcome: 'completed',
        summary: 'Implementation completed and is ready for review.',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.lease.status).toBe('released');
        expect(response.body.data.state).toBe('readyForReview');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${taskId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.state).toBe('readyForReview');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/runtimes/${runtimeId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.connectionStatus).toBe('online');
        expect(response.body.reportedStatus).toBe('idle');
        expect(response.body.activeJobSummary).toBeNull();
      });

    const artifacts = await prisma.runtimeArtifact.findMany({
      where: { leaseId },
    });

    expect(artifacts).toHaveLength(1);
  });

  it('/api/v1/projects/:projectId/worktrees lifecycle endpoints', async () => {
    const runtimeId = `worktree-runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Worktree runtime',
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Worktree Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for worktree persistence.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Worktree epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Persist worktree state',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    const upsertResponse = await request(app.getHttpServer())
      .put(`/api/v1/projects/${projectId}/worktrees`)
      .send({
        workItemId,
        runtimeId,
        status: 'active',
        path: `/tmp/${projectId}/${workItemId}`,
        branchName: `task/${workItemId}`,
        baseBranch: 'main',
        headSha: 'abc123',
        isDirty: false,
        details: 'Initial worktree created by the runtime.',
      })
      .expect(200);

    const worktreeId = upsertResponse.body.data.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/worktrees`)
      .expect(200)
      .expect((response) => {
        expect(response.body.projectId).toBe(projectId);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].status).toBe('active');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/worktrees/${worktreeId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(worktreeId);
        expect(response.body.branchName).toBe(`task/${workItemId}`);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/worktrees/${worktreeId}/stale`)
      .send({
        reason: 'The runtime lost the lock and the worktree is stale.',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.status).toBe('stale');
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/worktrees/${worktreeId}/cleanup`)
      .send({
        reason: 'Operator requested cleanup after inspection.',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.status).toBe('cleanupPending');
        expect(response.body.data.cleanupRequestedAt).not.toBeNull();
      });
  });

  it('/api/v1/projects/:projectId/work-items/:workItemId/agent-runs persistence endpoints', async () => {
    const runtimeId = `agent-runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Agent runtime',
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Agent Run Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for agent run persistence.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Agent run epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Persist agent run',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    const createRunResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs`)
      .send({
        agentType: 'planner',
        runtimeId,
        status: 'running',
        summary: 'Planning run started.',
      })
      .expect(201);

    const runId = createRunResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(
        `/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs/${runId}/decisions`,
      )
      .send({
        decision: 'Split the requested work into two phases.',
        rationale: 'The repository already contains the queue configuration slice.',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.decisions).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .put(
        `/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs/${runId}/prompt-snapshot`,
      )
      .send({
        systemPrompt: 'You are the planning agent.',
        userPrompt: 'Break the work item into implementation phases.',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.promptSnapshot.systemPrompt).toContain('planning agent');
      });

    await request(app.getHttpServer())
      .post(
        `/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs/${runId}/artifacts`,
      )
      .send({
        artifactType: 'plan',
        label: 'Phase breakdown',
        content: 'Phase 1: queue defaults. Phase 2: runtime dispatch.',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.artifacts).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .post(
        `/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs/${runId}/failure`,
      )
      .send({
        errorMessage: 'Planner hit an ambiguous requirement.',
        details: 'Need operator clarification on release sequencing.',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.status).toBe('failed');
        expect(response.body.data.failure.errorMessage).toContain('ambiguous requirement');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].decisions).toHaveLength(1);
        expect(response.body.items[0].artifacts).toHaveLength(1);
        expect(response.body.items[0].failure).not.toBeNull();
        expect(response.body.items[0].promptSnapshot).not.toBeNull();
      });
  });

  it('/api/v1/projects/:projectId/agents/planning/work-items/:workItemId/execute decomposes planning requests', async () => {
    const runtimeId = `planning-runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Planning runtime',
        capabilities: ['planning'],
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Planning Agent Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription:
          'Convert approved planning requests into actionable plans and keep ready-for-dev filled.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/start`)
      .expect(201);

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({
        title: 'Planning requests',
      })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Decompose operator dashboard planning request',
        description: 'Break the approved scope into executable subtasks with validation.',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    const executionResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/agents/planning/work-items/${workItemId}/execute`)
      .send({ runtimeId })
      .expect(201);

    expect(executionResponse.body.data.accepted).toBe(true);
    expect(executionResponse.body.data.tasks.length).toBeGreaterThanOrEqual(2);
    expect(executionResponse.body.data.promotedToReadyForDevIds).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.state).toBe('planning');
        expect(response.body.acceptanceCriteria.length).toBeGreaterThan(0);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(2);
        expect(response.body.items[0].agentType).toBe('planning');
        expect(response.body.items[0].artifacts).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/usage/summary`)
      .expect(200)
      .expect((response) => {
        expect(response.body.totalEvents).toBe(2);
      });
  });

  it('/api/v1/projects/:projectId/agents/dev/work-items/:workItemId/execute implements ready-for-dev work', async () => {
    const runtimeId = `dev-runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Dev runtime',
        capabilities: ['dev'],
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Dev Agent Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Implement ready-for-dev work in isolated worktrees.',
        developmentPlan: 'Create implementation-ready work and validate it before review.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Dev execution epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Implement runtime execution summary',
        description: 'Add a summary artifact and validate checks before review.',
        priority: 'high',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items/${workItemId}/acceptance-criteria`)
      .send({ text: 'A patch artifact is recorded for the work item.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({
        toState: 'planning',
        reason: 'Prepared for planning before dev execution.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({
        toState: 'readyForDev',
        reason: 'Prepared for dev agent execution.',
      })
      .expect(201);

    const executionResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/agents/dev/work-items/${workItemId}/execute`)
      .send({ runtimeId })
      .expect(201);

    expect(executionResponse.body.data.nextState).toBe('readyForReview');
    expect(executionResponse.body.data.checks).toHaveLength(4);
    expect(executionResponse.body.data.artifactLabels).toEqual([
      'Implementation patch',
      'Execution checks',
    ]);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.state).toBe('readyForReview');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].agentType).toBe('dev');
        expect(response.body.items[0].artifacts).toHaveLength(2);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/worktrees`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].status).toBe('active');
      });
  });

  it('/api/v1/projects/:projectId/agents/review/work-items/:workItemId/execute evaluates review gates', async () => {
    const runtimeId = `review-agent-runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Review agent runtime',
        capabilities: ['dev', 'review'],
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Review Agent Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Review completed work and promote it when all gates pass.',
        developmentPlan: 'Build review-ready work and capture release decisions.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Review execution epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Implement review-ready queue summary',
        description: 'Capture artifacts and run the review lane.',
        priority: 'high',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items/${workItemId}/acceptance-criteria`)
      .send({ text: 'Review gate results are recorded for the work item.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'planning', reason: 'Prepared for implementation.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'readyForDev', reason: 'Prepared for dev execution.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/agents/dev/work-items/${workItemId}/execute`)
      .send({ runtimeId })
      .expect(201);

    const reviewResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/agents/review/work-items/${workItemId}/execute`)
      .send({ runtimeId })
      .expect(201);

    expect(reviewResponse.body.data.passed).toBe(true);
    expect(reviewResponse.body.data.nextState).toBe('readyForRelease');

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.state).toBe('readyForRelease');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}/review-gates`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].overallStatus).toBe('passed');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(2);
        expect(response.body.items[0].agentType).toBe('review');
      });
  });

  it('/api/v1/projects/:projectId/agents/release/work-items/:workItemId/execute releases ready work', async () => {
    const runtimeId = `release-agent-runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Release agent runtime',
        capabilities: ['dev', 'review', 'release'],
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Release Agent Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Release ready work automatically with versioning and notes.',
        developmentPlan: 'Promote validated work through release automation.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Release automation epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Ship autonomous release metadata',
        description: 'Generate release version, notes, and archive the release worktree.',
        priority: 'high',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items/${workItemId}/acceptance-criteria`)
      .send({ text: 'A release record with version and note exists for the work item.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'planning', reason: 'Prepared for implementation.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'readyForDev', reason: 'Prepared for dev execution.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/agents/dev/work-items/${workItemId}/execute`)
      .send({ runtimeId })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/agents/review/work-items/${workItemId}/execute`)
      .send({ runtimeId })
      .expect(201);

    const releaseResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/agents/release/work-items/${workItemId}/execute`)
      .send({ runtimeId })
      .expect(201);

    expect(releaseResponse.body.data.nextState).toBe('released');
    expect(releaseResponse.body.data.releaseRun.status).toBe('succeeded');
    expect(releaseResponse.body.data.releaseRun.version.tagName).toBe('v1.0.1');

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.state).toBe('released');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/releases`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].note.title).toContain('v1.0.1');
      });
  });

  it('/api/v1/projects/:projectId/agents/release/work-items/:workItemId/execute escalates repeated merge conflicts', async () => {
    const runtimeId = `release-conflict-runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Release conflict runtime',
        capabilities: ['release'],
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Release Conflict Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Escalate release merge conflicts after retry limits are exceeded.',
        queueLimits: {
          maxPlanning: 10,
          maxReadyForDev: 12,
          maxInDev: 3,
          maxReadyForReview: 3,
          maxInReview: 2,
          maxReadyForRelease: 2,
          maxReviewRetries: 3,
          maxMergeConflictRetries: 0,
          maxRuntimeRetries: 3,
          maxAmbiguityRetries: 2,
        },
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/start`)
      .expect(201);

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Release conflict epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Escalate release conflict',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'planning' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'readyForDev' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'inDev' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'readyForReview' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'inReview' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'readyForRelease' })
      .expect(201);

    const releaseResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/agents/release/work-items/${workItemId}/execute`)
      .send({ runtimeId, outcome: 'mergeConflict' })
      .expect(201);

    expect(releaseResponse.body.data.nextState).toBe('requiresHumanIntervention');
    expect(releaseResponse.body.data.interventionId).toBeTruthy();

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.state).toBe('requiresHumanIntervention');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/interventions`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].summary).toContain('merge conflicts');
      });
  });

  it('/api/v1/projects/:projectId/work-items/:workItemId/review-gates persistence endpoints', async () => {
    const runtimeId = `review-runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Review runtime',
        capabilities: ['review'],
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Review Gate Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for review gate persistence.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await prisma.project.update({
      where: { id: projectId },
      data: { lifecycleStatus: 'ACTIVE' },
    });

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Review epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Persist review gate result',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    const criterionResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items/${workItemId}/acceptance-criteria`)
      .send({
        text: 'All automated checks pass and criteria are verified.',
      })
      .expect(201);

    const criterionId =
      criterionResponse.body.data.epics[0].tasks[0].acceptanceCriteria[0]
        .id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'planning' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'readyForDev' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'inDev' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'readyForReview' })
      .expect(201);

    const acquireResponse = await request(app.getHttpServer())
      .post('/api/v1/scheduler/leases/acquire')
      .send({
        runtimeId,
        lanes: ['review'],
        projectId,
      })
      .expect(201);

    const leaseId = acquireResponse.body.data.lease.id as string;

    const agentRunResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs`)
      .send({
        agentType: 'review',
        runtimeId,
        leaseId,
        status: 'completed',
        summary: 'Review agent executed all quality checks.',
      })
      .expect(201);

    const agentRunId = agentRunResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/review-gates`)
      .send({
        runtimeId,
        leaseId,
        agentRunId,
        summary: 'Initial review failed because one acceptance criterion is incomplete.',
        checks: [
          { name: 'build', status: 'passed' },
          { name: 'lint', status: 'passed' },
          { name: 'typecheck', status: 'passed' },
          { name: 'test', status: 'passed' },
          { name: 'acceptanceCriteria', status: 'failed', details: 'One criterion remains unchecked.' },
          { name: 'reviewFeedback', status: 'passed' },
        ],
        criteriaEvaluations: [
          {
            criterionId,
            text: 'All automated checks pass and criteria are verified.',
            status: 'failed',
            details: 'Criterion evidence was not attached yet.',
            sortOrder: 0,
          },
        ],
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.overallStatus).toBe('failed');
        expect(response.body.data.criteriaEvaluations).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}/review-gates`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].checks).toHaveLength(6);
        expect(response.body.items[0].agentRunId).toBe(agentRunId);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}/review-gates/summary`)
      .expect(200)
      .expect((response) => {
        expect(response.body.totalResults).toBe(1);
        expect(response.body.failedResults).toBe(1);
        expect(response.body.latest.overallStatus).toBe('failed');
        expect(response.body.latestChecks.acceptanceCriteria).toBe('failed');
        expect(response.body.latestCriteria.failed).toBe(1);
      });
  });

  it('/api/v1/projects/:projectId/work-items/:workItemId/releases persistence endpoints', async () => {
    const runtimeId = `release-runtime-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Release runtime',
        capabilities: ['release'],
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Release Run Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for release persistence.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/start`)
      .expect(201);

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Release epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Persist release metadata',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'planning' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'readyForDev' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'inDev' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'readyForReview' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'inReview' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'readyForRelease' })
      .expect(201);

    const acquireResponse = await request(app.getHttpServer())
      .post('/api/v1/scheduler/leases/acquire')
      .send({
        runtimeId,
        lanes: ['release'],
        projectId,
      })
      .expect(201);

    const leaseId = acquireResponse.body.data.lease.id as string;

    const worktreeResponse = await request(app.getHttpServer())
      .put(`/api/v1/projects/${projectId}/worktrees`)
      .send({
        workItemId,
        runtimeId,
        leaseId,
        status: 'lockedByRelease',
        path: `/tmp/${projectId}/${workItemId}-release`,
        branchName: `release/${workItemId}`,
        baseBranch: 'main',
        headSha: 'deadbeef',
        isDirty: false,
        details: 'Release worktree prepared by the runtime.',
      })
      .expect(200);

    const worktreeId = worktreeResponse.body.data.id as string;

    const startResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/releases`)
      .send({
        runtimeId,
        leaseId,
        worktreeId,
        summary: 'Release started from the release worktree.',
      })
      .expect(201);

    const releaseRunId = startResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(
        `/api/v1/projects/${projectId}/work-items/${workItemId}/releases/${releaseRunId}/version`,
      )
      .send({
        version: 'v1.0.0',
        tagName: 'v1.0.0',
        targetBranch: 'main',
        commitSha: 'abc123def456',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.version.version).toBe('v1.0.0');
      });

    await request(app.getHttpServer())
      .put(
        `/api/v1/projects/${projectId}/work-items/${workItemId}/releases/${releaseRunId}/notes`,
      )
      .send({
        title: 'Release 1.0.0',
        content: 'First stable release with release metadata persistence.',
        format: 'markdown',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.note.title).toBe('Release 1.0.0');
      });

    await request(app.getHttpServer())
      .post(
        `/api/v1/projects/${projectId}/work-items/${workItemId}/releases/${releaseRunId}/result`,
      )
      .send({
        status: 'succeeded',
        summary: 'Merged successfully and tagged for release.',
        mergeCommitSha: 'ff00112233',
        releaseUrl: 'https://github.com/Evolvo-org/evolvo-suite/releases/tag/v1.0.0',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.status).toBe('succeeded');
        expect(response.body.data.note).not.toBeNull();
        expect(response.body.data.version).not.toBeNull();
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/releases`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].status).toBe('succeeded');
        expect(response.body.items[0].version.tagName).toBe('v1.0.0');
        expect(response.body.items[0].note.content).toContain('stable release');
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.state).toBe('released');
      });
  }, 10_000);

  it('/api/v1/projects/:projectId/interventions lifecycle endpoints', async () => {
    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Intervention Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for intervention persistence.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Intervention epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Escalate blocked work',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'planning' })
      .expect(201);

    const createInterventionResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/interventions`)
      .send({
        summary: 'Missing deployment secret',
        reason: 'The release runtime could not find the production token.',
        attemptsMade: 'Checked runtime env and retried secret lookup twice.',
        evidence: 'stderr: missing PROD_TOKEN',
        suggestedAction: 'Restore PROD_TOKEN and retry the work item.',
      })
      .expect(201);

    const firstInterventionId = createInterventionResponse.body.data.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/interventions`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].suggestedAction).toContain('Restore PROD_TOKEN');
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/interventions/${firstInterventionId}/resolve`)
      .send({
        resolutionNotes: 'Secret restored and operator acknowledged the issue.',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.status).toBe('resolved');
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({
        toState: 'planning',
        operatorOverride: true,
        reason: 'Resume planning after manual intervention resolution.',
      })
      .expect(201);

    const retryInterventionResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/interventions`)
      .send({
        summary: 'Planner requires clarification',
        reason: 'The task still needs operator confirmation for retry scope.',
        suggestedAction: 'Move the item back to readyForDev after clarification.',
      })
      .expect(201);

    const retryInterventionId = retryInterventionResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/interventions/${retryInterventionId}/retry`)
      .send({
        toState: 'readyForDev',
        resolutionNotes: 'Operator clarified the scope and approved retry.',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.status).toBe('resolved');
        expect(response.body.data.retryCount).toBe(1);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/work-items/${workItemId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.state).toBe('readyForDev');
      });
  });

  it('/api/v1/projects/:projectId/usage and /api/v1/usage/users/:userId summaries', async () => {
    const runtimeId = `usage-runtime-${Date.now()}`;
    const userId = `user-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/runtimes/register')
      .send({
        runtimeId,
        displayName: 'Usage runtime',
      })
      .expect(201);

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Usage Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for usage persistence.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Usage epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Capture token usage',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    const createRunResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/agent-runs`)
      .send({
        agentType: 'dev',
        runtimeId,
        status: 'completed',
        summary: 'Usage reporting run',
      })
      .expect(201);

    const agentRunId = createRunResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/usage/events`)
      .send({
        workItemId,
        agentRunId,
        runtimeId,
        userId,
        agentType: 'dev',
        provider: 'OpenAI',
        model: 'GPT-5.4',
        inputTokens: 1200,
        outputTokens: 800,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.provider).toBe('openai');
        expect(response.body.data.model).toBe('gpt-5.4');
        expect(response.body.data.totalTokens).toBe(2000);
        expect(response.body.data.estimatedCostUsd).toBeGreaterThan(0);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/usage/events`)
      .send({
        userId,
        agentType: 'review',
        provider: 'Codex SDK',
        model: 'codex-mini-latest',
        inputTokens: 400,
        outputTokens: 100,
        estimatedCostUsd: 0.005,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/usage/summary`)
      .expect(200)
      .expect((response) => {
        expect(response.body.projectId).toBe(projectId);
        expect(response.body.totalEvents).toBe(2);
        expect(response.body.totalTokens).toBe(2500);
        expect(response.body.byAgent).toHaveLength(2);
        expect(response.body.byProviderModel.some((item: { key: string }) => item.key === 'openai:gpt-5.4')).toBe(true);
        expect(response.body.byProviderModel.some((item: { key: string }) => item.key === 'codex:codex-mini-latest')).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/usage/users/${userId}/summary`)
      .expect(200)
      .expect((response) => {
        expect(response.body.userId).toBe(userId);
        expect(response.body.totalEvents).toBe(2);
        expect(response.body.estimatedCostUsd).toBeGreaterThan(0);
      });
  });

  it('/api/v1/billing scaffolding endpoints', async () => {
    const adminAuthorization = await loginAs('admin');

    await request(app.getHttpServer())
      .put('/api/v1/billing/customer')
      .set('authorization', adminAuthorization)
      .send({
        workspaceKey: 'default',
        stripeCustomerId: 'cus_test_123',
        email: 'owner@example.com',
        displayName: 'Evolvo Sandbox',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.stripeCustomerId).toBe('cus_test_123');
      });

    await request(app.getHttpServer())
      .put('/api/v1/billing/subscription')
      .set('authorization', adminAuthorization)
      .send({
        workspaceKey: 'default',
        stripeSubscriptionId: 'sub_test_123',
        status: 'trialing',
        planKey: 'sandbox-monthly',
        adminBypassActive: true,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.status).toBe('trialing');
        expect(response.body.data.adminBypassActive).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/v1/billing/subscription')
      .set('authorization', adminAuthorization)
      .expect(200)
      .expect((response) => {
        expect(response.body.customer.stripeCustomerId).toBe('cus_test_123');
        expect(response.body.subscription.stripeSubscriptionId).toBe('sub_test_123');
        expect(response.body.accessGranted).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/v1/billing/portal-session')
      .set('authorization', adminAuthorization)
      .send({
        workspaceKey: 'default',
        returnUrl: 'http://localhost:3000/settings/billing',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.workspaceKey).toBe('default');
        expect(response.body.data.url).toContain('billingSession=');
      });

    await request(app.getHttpServer())
      .post('/api/v1/billing/webhooks/stripe')
      .send({
        eventId: `evt_${Date.now()}`,
        eventType: 'customer.subscription.updated',
        workspaceKey: 'default',
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        status: 'active',
        planKey: 'sandbox-monthly',
        payloadJson: '{"source":"test"}',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.subscription.status).toBe('active');
        expect(response.body.data.lastWebhookReceivedAt).not.toBeNull();
      });

    const operatorAuthorization = await loginAs('operator');

    await request(app.getHttpServer())
      .put('/api/v1/billing/customer')
      .set('authorization', operatorAuthorization)
      .send({
        workspaceKey: 'default',
        stripeCustomerId: 'cus_test_234',
      })
      .expect(403);
  });

  it('/realtime namespace emits project-scoped workflow events', async () => {
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const createProjectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({
        name: `Realtime Test ${Date.now()}`,
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
        productDescription: 'Validation fixture for realtime workflow events.',
      })
      .expect(201);

    const projectId = createProjectResponse.body.data.id as string;

    const createEpicResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/epics`)
      .send({ title: 'Realtime epic' })
      .expect(201);

    const epicId = createEpicResponse.body.data.epics[0].id as string;

    const createTaskResponse = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/planning/work-items`)
      .send({
        epicId,
        kind: 'task',
        title: 'Broadcast workflow transition',
      })
      .expect(201);

    const workItemId = createTaskResponse.body.data.epics[0].tasks[0].id as string;

    const client = createSocketClient(`http://127.0.0.1:${port}/realtime`, {
      transports: ['websocket'],
      forceNew: true,
      auth: {
        token: 'evolvo-local-realtime-token',
        projectId,
      },
    });

    const receivedEvent = new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timed out waiting for realtime event.'));
      }, 5_000);

      client.on('project.workflow.updated', (payload) => {
        clearTimeout(timer);
        resolve(payload as Record<string, unknown>);
      });

      client.on('realtime.error', (payload: { message: string }) => {
        clearTimeout(timer);
        reject(new Error(payload.message));
      });
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (error) => reject(error));
    });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/work-items/${workItemId}/transition`)
      .send({ toState: 'planning' })
      .expect(201);

    await expect(receivedEvent).resolves.toMatchObject({
      name: 'project.workflow.updated',
      projectId,
      workItemId,
    });

    client.close();
  }, 10_000);
});

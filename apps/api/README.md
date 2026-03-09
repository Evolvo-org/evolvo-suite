# Evolvo API

## Getting Started

First, generate Prisma and run the development server:

```bash
pnpm --filter @repo/db generate
pnpm --filter @repo/db migrate:dev
pnpm --filter api dev
```

By default, the server runs at [localhost:3000/api/v1](http://localhost:3000/api/v1).

The API is the only service allowed to access Prisma and the database.

## Environment

- `PORT`
- `API_PREFIX`
- `DATABASE_URL`
- `CORS_ORIGIN`

## Current endpoints

- `GET /api/v1/health`
- `GET|POST|PATCH /api/v1/projects`
- `POST /api/v1/projects/:projectId/start`
- `POST /api/v1/projects/:projectId/stop`
- `GET /api/v1/projects/:projectId/status`
- `GET|PUT /api/v1/projects/:projectId/product-spec`
- `GET|POST|PATCH /api/v1/projects/:projectId/development-plan`
- `GET /api/v1/projects/:projectId/development-plan/versions`
- `POST /api/v1/projects/:projectId/development-plan/versions/activate`

If you plan to `build` or `test` the app, build shared packages first.

## Learn More

Learn more about `NestJs` with following resources:

- [Official Documentation](https://docs.nestjs.com) - A progressive Node.js framework for building efficient, reliable and scalable server-side applications.
- [Official NestJS Courses](https://courses.nestjs.com) - Learn everything you need to master NestJS and tackle modern backend applications at any scale.
- [GitHub Repo](https://github.com/nestjs/nest)

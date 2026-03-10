# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS build
WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/db generate
RUN pnpm --filter api build

FROM node:22-bookworm-slim AS runner
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app /app

RUN chmod +x /app/apps/api/docker-entrypoint.sh

EXPOSE 3001

CMD ["./apps/api/docker-entrypoint.sh"]

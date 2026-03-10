# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/* \
	&& corepack enable

FROM base AS pruner
WORKDIR /app

COPY . .

RUN pnpm dlx turbo@2.8.14 prune api --docker

FROM base AS build
WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

COPY --from=pruner /app/out/json/ .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
	pnpm install --frozen-lockfile --store-dir /pnpm/store

COPY --from=pruner /app/out/full/ .

RUN pnpm --filter @repo/db generate
RUN pnpm turbo run build --filter=api...

FROM node:22-bookworm-slim AS runner
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/* \
	&& corepack enable

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app /app

RUN chmod +x /app/apps/api/docker-entrypoint.sh

EXPOSE 3001

CMD ["./apps/api/docker-entrypoint.sh"]

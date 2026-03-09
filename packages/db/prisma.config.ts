import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

const currentDirectoryPath = dirname(fileURLToPath(import.meta.url));
const rootEnvironmentFilePath = resolve(currentDirectoryPath, "../../.env");
const localEnvironmentFilePath = resolve(currentDirectoryPath, ".env");

config({
  path: existsSync(rootEnvironmentFilePath)
    ? rootEnvironmentFilePath
    : localEnvironmentFilePath,
});

export default defineConfig({
  schema: "prisma/",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

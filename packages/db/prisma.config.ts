import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

const rootEnvironmentFilePath = resolve(process.cwd(), "../../.env");
const localEnvironmentFilePath = resolve(process.cwd(), ".env");

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

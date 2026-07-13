import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { AppEnv, envSchema } from "./env.schema";

let cachedEnv: AppEnv | null = null;
let dotenvLoaded = false;

function formatValidationError(error: string) {
  return `Invalid environment configuration:\n${error}`;
}

function ensureDotenvLoaded() {
  if (dotenvLoaded) {
    return;
  }

  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", ".env"),
    resolve(process.cwd(), "..", "..", ".env"),
    resolve(dirname(__dirname), ".env"),
    resolve(dirname(__dirname), "..", ".env"),
    resolve(dirname(__dirname), "..", "..", ".env"),
  ];

  const path = candidates.find((candidate) => existsSync(candidate));
  loadDotenv(path ? { path } : undefined);
  dotenvLoaded = true;
}

export function loadEnvConfig(input: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  ensureDotenvLoaded();

  const parsed = envSchema.safeParse(input);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("\n");

    throw new Error(formatValidationError(details));
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getEnvConfig(): AppEnv {
  return cachedEnv ?? loadEnvConfig();
}

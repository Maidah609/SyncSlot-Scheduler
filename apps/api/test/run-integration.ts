import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  NODE_ENV: "test",
};

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=1", "test/**/*.test.ts"],
  {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: true,
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

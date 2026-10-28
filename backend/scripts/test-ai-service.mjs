import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cwd = resolve(root, "backend/ai-service");
const files = readdirSync(resolve(cwd, "test"))
  .filter((f) => f.endsWith(".test.cjs"))
  .map((f) => "test/" + f);
const run = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=2", ...files],
  {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: 240000,
    maxBuffer: 8 * 1024 * 1024,
  },
);
const output = (run.stdout || "") + (run.stderr || "");
const report = {
  runAt: new Date().toISOString(),
  mode: "isolated fixtures; no live model calls",
  concurrency: 2,
  exitCode: run.status,
  tests: Number(/# tests (\d+)/.exec(output)?.[1] ?? 0),
  passed: Number(/# pass (\d+)/.exec(output)?.[1] ?? 0),
  failed: Number(/# fail (\d+)/.exec(output)?.[1] ?? 0),
  failures: [...output.matchAll(/^not ok .*$/gm)].map((m) => m[0]),
  ...(run.error ? { error: run.error.message } : {}),
};
const target = resolve(root, "docs/testing/ai-performance");
mkdirSync(target, { recursive: true });
writeFileSync(
  resolve(target, "tests.json"),
  JSON.stringify(report, null, 2) + "\n",
);
const logs = resolve(root, "../.tmp/ai-performance");
mkdirSync(logs, { recursive: true });
writeFileSync(resolve(logs, "tests.log"), output);
console.log(JSON.stringify(report));
if (report.failed || run.status !== 0) process.exitCode = 1;

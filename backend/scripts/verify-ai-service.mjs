import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const logs = resolve(root, "../.tmp/ai-service-audit");
const target = resolve(root, "docs/testing/ai-service-audit-results.json");
mkdirSync(logs, { recursive: true });
const steps = [];
function run(name, executable, args, cwd = root, extraEnv = {}) {
  console.log("Running " + name);
  const start = Date.now();
  const result = spawnSync(executable, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    windowsHide: true,
    encoding: "utf8",
    timeout: 300000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const output = (result.stdout || "") + (result.stderr || "");
  writeFileSync(resolve(logs, name + ".log"), output);
  const step = {
    name,
    status: result.status === 0 ? "PASS" : "FAIL",
    exitCode: result.status,
    durationMs: Date.now() - start,
  };
  const pythonCount = /Ran (\d+) tests?/.exec(output);
  if (pythonCount) step.tests = Number(pythonCount[1]);
  const jestCount = /Tests:\s+(\d+) passed,\s+(\d+) total/.exec(output);
  if (jestCount) step.tests = Number(jestCount[2]);
  const nodeCount = /# tests (\d+)/.exec(output);
  if (nodeCount) step.tests = Number(nodeCount[1]);
  if (result.error) step.error = result.error.code || result.error.message;
  steps.push(step);
  console.log(step.status + " " + name);
  return step;
}
async function probe(url, headers = {}) {
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(4000),
      redirect: "error",
    });
    await response.body?.cancel();
    return { reachable: true, status: response.status };
  } catch {
    return { reachable: false };
  }
}
const build = run(
  "ai-build",
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
  resolve(root, "backend/ai-service"),
);
if (build.status === "PASS")
  run("ai-tests", process.execPath, [
    "backend/scripts/test-ai-service.mjs",
    ...(process.argv.includes("--serial") ? ["--serial"] : []),
  ]);
else
  steps.push({ name: "ai-tests", status: "BLOCKED", reason: "Build failed" });
const python = resolve(
  root,
  "backend/ai-service/.venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
run(
  "frontend-types",
  process.execPath,
  ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"],
  resolve(root, "frontend/web"),
);
run("frontend-stream-tests", process.execPath, [
  "--test",
  "frontend/web/scripts/work-assistant.test.mjs",
]);
for (const service of ["project", "calendar"]) {
  const cwd = resolve(root, "backend/" + service + "-service");
  run(
    service + "-source-types",
    process.execPath,
    [
      "node_modules/typescript/bin/tsc",
      "--project",
      "tsconfig.build.json",
      "--noEmit",
      "--incremental",
      "false",
    ],
    cwd,
  );
  run(
    service + "-source-tests",
    process.execPath,
    [
      "node_modules/jest/bin/jest.js",
      "--runInBand",
      "--runTestsByPath",
      "src/modules/work-assistant/work-assistant.service.spec.ts",
      "--silent",
    ],
    cwd,
  );
}
if (existsSync(python))
  run(
    "speech-tests",
    python,
    ["-m", "unittest", "test_app", "-v"],
    resolve(root, "backend/speech-worker"),
  );
else
  steps.push({
    name: "speech-tests",
    status: "BLOCKED",
    reason: "Local Python environment is not installed",
  });
if (process.argv.includes("--browser")) {
  const browser = await probe("http://localhost:3100/login");
  const source = await probe("http://localhost:18110/api/auth/refresh");
  if (browser.status === 200 && source.status === 200)
    run("browser", process.execPath, [
      "backend/scripts/work-assistant-sim/conversations.cjs",
    ]);
  else
    steps.push({
      name: "browser",
      status: "BLOCKED",
      reason: "Start the fixture backend on 18110 and frontend on 3100 first",
    });
}
if (process.argv.includes("--media")) {
  const require = createRequire(
    resolve(root, "backend/ai-service/package.json"),
  );
  const env = require("dotenv").parse(
    readFileSync(resolve(root, "backend/ai-service/.env")),
  );
  const speech = await probe("http://127.0.0.1:8090/ready", {
    "x-internal-service-key": env.MEETING_STT_SERVICE_KEY || "",
  });
  if (
    speech.status === 200 &&
    existsSync(resolve(root, "../.tmp/meeting-local-speech/sample.mp4"))
  ) {
    const temp = resolve(logs, "media-temp");
    mkdirSync(temp, { recursive: true });
    run(
      "media",
      process.execPath,
      ["backend/scripts/test-local-speech.cjs"],
      root,
      { TEMP: temp, TMP: temp },
    );
  } else
    steps.push({
      name: "media",
      status: "BLOCKED",
      reason: "Start local speech and prepare the public test MP4 first",
    });
}
const live = await Promise.all([
  probe("http://127.0.0.1:8087/ready"),
  probe("http://127.0.0.1:8083/health"),
]);
const aiReport = resolve(root, "docs/testing/ai-performance/tests.json");
const suite =
  existsSync(aiReport) &&
  steps.some((s) => s.name === "ai-tests" && s.status === "PASS")
    ? JSON.parse(readFileSync(aiReport))
    : null;
const report = {
  runAt: new Date().toISOString(),
  mode: "isolated SQL and source/auth fixtures; no external model or cloud speech calls",
  automatedPassed: steps.every((s) => s.status !== "FAIL"),
  requestedChecksComplete: steps.every((s) => s.status === "PASS"),
  aiTests: suite
    ? { total: suite.tests, passed: suite.passed, failed: suite.failed }
    : null,
  steps,
  liveDeployment: {
    verified: false,
    aiService: live[0],
    communicationService: live[1],
    reason:
      "Full authenticated deployment, provider behavior and real recording permissions are separate live scenarios; fixture checks do not certify them",
  },
};
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
if (!report.automatedPassed) process.exitCode = 1;

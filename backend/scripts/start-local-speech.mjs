import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(root, "backend/ai-service/package.json"));
const env = require("dotenv").parse(
  readFileSync(resolve(root, "backend/ai-service/.env")),
);
const python =
  env.MEETING_STT_PYTHON ||
  resolve(
    root,
    "backend/ai-service/.venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
const worker = spawn(
  python,
  [
    "-m",
    "uvicorn",
    "app:app",
    "--host",
    "127.0.0.1",
    "--port",
    "8090",
    "--no-access-log",
  ],
  {
    cwd: resolve(root, "backend/speech-worker"),
    windowsHide: true,
    stdio: "inherit",
    env: {
      ...process.env,
      SPEECH_SERVICE_KEY: env.MEETING_STT_SERVICE_KEY || "",
      STT_MODEL_PATH:
        env.MEETING_STT_MODEL_PATH ||
        resolve(root, "backend/speech-worker/models/small"),
      STT_CPU_THREADS: env.MEETING_STT_CPU_THREADS || "4",
      HF_HUB_DISABLE_TELEMETRY: "1",
      HF_HUB_OFFLINE: "1",
      PYTHONUTF8: "1",
    },
  },
);
worker.on("error", () => {
  console.error(
    "Cannot start local speech worker; install backend/speech-worker/requirements.txt first",
  );
  process.exitCode = 1;
});
worker.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => worker.kill(signal));

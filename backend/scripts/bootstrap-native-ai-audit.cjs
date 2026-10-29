const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "../..");
const directory = path.resolve(root, "../.tmp/ai-native-stack");
const statePath = path.join(directory, "state.json");
const state = JSON.parse(fs.readFileSync(statePath));
const { ports, keys } = state;
const ai = path.join(root, "backend/ai-service");
const requireAi = createRequire(path.join(ai, "package.json"));
const dotenv = requireAi("dotenv");
const originalAi = dotenv.parse(fs.readFileSync(path.join(ai, ".env")));
const envFor = (name) => ({
  ...process.env, NODE_ENV: "production", PORT: String(ports[name]),
  DATABASE_URL: `postgresql://qa:${keys.pg}@127.0.0.1:${ports.pg}/${name === "ai" ? "ai" : name}_db`,
  REDIS_URL: `redis://:${keys.redis}@127.0.0.1:${ports.redis}/0`, REDIS_HOST: "127.0.0.1", REDIS_PORT: String(ports.redis), REDIS_PASSWORD: keys.redis,
  JWT_SECRET_KEY: keys.jwt, JWT_ISSUER: "workspace-hub", INTERNAL_SERVICE_KEY: keys.communication,
  AI_DOCUMENT_SERVICE_KEY: keys.document, AI_COMMUNICATION_SERVICE_KEY: keys.communication, WORK_ASSISTANT_SERVICE_KEY: keys.work, CALENDAR_DOCUMENT_SERVICE_KEY: keys.document,
  CONVERSATION_AI_ENABLED: "true", MEETING_SUMMARY_ENABLED: "true",
  AI_SERVICE_URL: `http://127.0.0.1:${ports.ai}`, COMMUNICATION_SERVICE_URL: `http://127.0.0.1:${ports.communication}`,
  DOCUMENT_SERVICE_URL: `http://127.0.0.1:${ports.document}`, PROJECT_SERVICE_URL: `http://127.0.0.1:${ports.project}`, CALENDAR_SERVICE_URL: `http://127.0.0.1:${ports.calendar}`,
  USER_SERVICE_URL: `http://127.0.0.1:${ports.user}`, FRONTEND_URL: "http://localhost:3000", CORS_ALLOWED_ORIGINS: "http://localhost:3000",
  KAFKA_BROKER: `localhost:${ports.kafka}`, KAFKA_BROKERS: `localhost:${ports.kafka}`,
  AWS_REGION: "us-east-1", AWS_ACCESS_KEY: "fixture", AWS_SECRET_KEY: "fixture", AWS_ACCESS_KEY_ID: "fixture", AWS_SECRET_ACCESS_KEY: "fixture",
  AWS_S3_BUCKET_NAME: "ai-qa-files", AWS_CLOUDFRONT_URL: `http://127.0.0.1:${ports.s3}/ai-qa-files`, AWS_ENDPOINT_URL_S3: `http://127.0.0.1:${ports.s3}`, AWS_EC2_METADATA_DISABLED: "true",
  LIVEKIT_URL: "ws://127.0.0.1:17880", LIVEKIT_API_KEY: "fixture", LIVEKIT_API_SECRET: keys.communication,
  MAIL_HOST: "127.0.0.1", MAIL_PORT: "11025", MAIL_USERNAME: "fixture", MAIL_PASSWORD: "fixture", GOOGLE_CLIENT_ID: "fixture.apps.googleusercontent.com",
});
function command(name, args, cwd, env, logName) {
  const result = spawnSync(name, args, { cwd, env, encoding: "utf8", windowsHide: true, timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(directory, logName), (result.stdout ?? "") + (result.stderr ?? ""));
  if (result.status !== 0) throw Error(`${logName} failed; inspect the local audit log`);
}
function start(name, executable, args, cwd, env) {
  const pidPath = path.join(directory, name + ".pid.json");
  const prior = fs.existsSync(pidPath) ? JSON.parse(fs.readFileSync(pidPath)) : state.processes.find((item) => item.name === name);
  if (prior) { try { process.kill(prior.pid, 0); console.log(name + " already running"); return; } catch {} }
  const stdout = fs.openSync(path.join(directory, name + ".out.log"), "a");
  const stderr = fs.openSync(path.join(directory, name + ".err.log"), "a");
  const child = spawn(executable, args, { cwd, env, detached: true, windowsHide: true, stdio: ["ignore", stdout, stderr] });
  child.unref(); fs.closeSync(stdout); fs.closeSync(stderr);
  fs.writeFileSync(pidPath, JSON.stringify({ name, pid: child.pid, executable, startedAt: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ started: name, pid: child.pid }));
}
(async () => {
  const name = process.argv[2];
  if (name === "speech") {
    start("speech", originalAi.MEETING_STT_PYTHON || path.join(ai, ".venv/Scripts/python.exe"),
      ["-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "18090", "--no-access-log"],
      path.join(root, "backend/speech-worker"), { ...process.env, SPEECH_SERVICE_KEY: keys.communication + "-stt",
        STT_MODEL_PATH: originalAi.MEETING_STT_MODEL_PATH || path.join(root, "backend/speech-worker/models/small"),
        STT_CPU_THREADS: "4", HF_HUB_OFFLINE: "1", HF_HUB_DISABLE_TELEMETRY: "1", PYTHONUTF8: "1" });
    return;
  }
  if (name === "moto") {
    start("moto", path.resolve(directory, "../ai-comprehensive-rag-venv/Scripts/moto_server.exe"), ["-H", "127.0.0.1", "-p", String(ports.s3)], directory, envFor("document"));
    return;
  }
  if (name === "databases") {
    const { Pool } = requireAi("pg");
    const pool = new Pool({ connectionString: envFor("ai").DATABASE_URL });
    try {
      for (const db of ["user_db", "document_db", "project_db", "calendar_db", "communication_db"])
        if (!(await pool.query("SELECT 1 FROM pg_database WHERE datname=$1", [db])).rowCount) await pool.query(`CREATE DATABASE ${db}`);
      for (const file of fs.readdirSync(path.join(ai, "migrations")).filter((file) => file.endsWith(".sql")).sort())
        await pool.query(fs.readFileSync(path.join(ai, "migrations", file), "utf8"));
    } finally { await pool.end(); }
    console.log("Created audit databases and migrated native AI SQL"); return;
  }
  if (["document", "project", "calendar", "communication"].includes(name)) {
    const cwd = path.join(root, "backend", name + "-service");
    const env = envFor(name);
    if (!process.argv.includes("--no-build")) {
      command(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], cwd, env, name + "-schema.log");
      command(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.build.json"], cwd, env, name + "-build.log");
    }
    const main = ["dist/main.js", "dist/src/main.js"].map((file) => path.join(cwd, file)).filter(fs.existsSync).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    if (!main) throw Error("Compiled entrypoint missing");
    start(name, process.execPath, [main], cwd, env); return;
  }
  if (name === "ai" || name === "jobs") {
    const env = { ...originalAi, ...envFor("ai"), AI_ENABLED: "true", BIND_HOST: "127.0.0.1", NODE_ENV: "test", DOTENV_CONFIG_PATH: "test/no-env", AI_GATEWAY_KEY: keys.gateway,
      RAG_SERVICE_KEY: keys.rag, RAG_WORKER_URL: `http://127.0.0.1:${ports.rag}`, WORK_ASSISTANT_ENABLED: "true",
      WORK_ASSISTANT_PROJECT_URL: `http://127.0.0.1:${ports.project}`, WORK_ASSISTANT_CALENDAR_URL: `http://127.0.0.1:${ports.calendar}`,
      AI_GATEWAY_KEY_PREVIOUS: "", CONVERSATION_AI_ENABLED: "true", MEETING_SUMMARY_ENABLED: "true", VISUAL_ENABLED: "true",
      MEETING_STT_URL: "http://127.0.0.1:18090", MEETING_STT_SERVICE_KEY: keys.communication + "-stt",
      MEETING_MEDIA_HOSTS: `127.0.0.1:${ports.s3}`,
    };
    start(name, process.execPath, [path.join(ai, name === "ai" ? "dist/main.js" : "dist/worker.js")], ai, env); return;
  }
  if (name === "user") {
    const cwd = path.join(root, "backend/user-service");
    const jar = fs.readdirSync(path.join(cwd, "target")).find((file) => file.endsWith(".jar"));
    if (!jar) throw Error("Build user-service JAR first");
    const env = { ...envFor("user"), SERVER_PORT: String(ports.user), POSTGRES_HOST: "127.0.0.1", POSTGRES_PORT: String(ports.pg), POSTGRES_DB: "user_db", POSTGRES_USERNAME: "qa", POSTGRES_PASSWORD: keys.pg, JAVA_TOOL_OPTIONS: "-Xmx256m", SPRING_DATA_REDIS_PASSWORD: keys.redis };
    start(name, "java", ["-jar", path.join(cwd, "target", jar)], cwd, env); return;
  }
  throw Error("Choose databases, moto, document, project, calendar, communication, ai, jobs or user");
})().catch((error) => { console.error(error.message); process.exitCode = 1; });

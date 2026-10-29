import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(root, "backend/ai-service/package.json"));
const dotenv = require("dotenv");
const paths = {
  host: resolve(root, "backend/ai-service/.env"),
  communication: resolve(root, "backend/communication-service/.env"),
  docker: resolve(root, "deploy/ai/.env"),
};
const load = (p) => dotenv.parse(readFileSync(p, "utf8"));
const ai = load(paths.host),
  communication = load(paths.communication);
if (
  (ai.AI_COMMUNICATION_SERVICE_KEY?.length ?? 0) < 32 ||
  ai.AI_COMMUNICATION_SERVICE_KEY !== communication.AI_COMMUNICATION_SERVICE_KEY
)
  throw new Error(
    "AI/Communication service keys must match before enabling summaries",
  );
const python = resolve(
  root,
  "backend/ai-service/.venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const ffmpeg = execFileSync(
  python,
  ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
  { encoding: "utf8", windowsHide: true },
).trim();
const model = resolve(root, "backend/speech-worker/models/small");
if (!existsSync(resolve(model, "model.bin")))
  throw new Error("Prepare the small speech model first");
const hosts = new Set(
  (ai.MEETING_MEDIA_HOSTS || "").split(",").filter(Boolean),
);
if (communication.AWS_S3_ENDPOINT) {
  const endpoint = new URL(communication.AWS_S3_ENDPOINT);
  hosts.add(
    communication.AWS_S3_FORCE_PATH_STYLE === "true"
      ? endpoint.host
      : communication.AWS_S3_BUCKET_NAME + "." + endpoint.host,
  );
} else {
  if (!communication.AWS_S3_BUCKET_NAME || !communication.AWS_REGION)
    throw new Error("Configure recording storage first");
  hosts.add(
    communication.AWS_S3_BUCKET_NAME +
      ".s3." +
      communication.AWS_REGION +
      ".amazonaws.com",
  );
}
const key =
  ai.MEETING_STT_SERVICE_KEY?.length >= 32
    ? ai.MEETING_STT_SERVICE_KEY
    : randomBytes(32).toString("hex");
function update(path, values) {
  let text = readFileSync(path, "utf8");
  for (const [name, value] of Object.entries(values)) {
    if (/[\r\n]/.test(value)) throw new Error("Invalid environment value");
    const line = name + "=" + value;
    const pattern = new RegExp("^" + name + "=.*$", "gm");
    text = pattern.test(text)
      ? text.replace(pattern, () => line)
      : text.trimEnd() + "\n" + line + "\n";
  }
  writeFileSync(path, text, "utf8");
}
const shared = {
  MEETING_SUMMARY_ENABLED: "true",
  MEETING_STT_CONCURRENCY: "1",
  MEETING_STT_SERVICE_KEY: key,
  MEETING_STT_TIMEOUT_MS: "180000",
  MEETING_MEDIA_HOSTS: [...hosts].join(","),
};
update(paths.host, {
  ...shared,
  MEETING_STT_URL: "http://127.0.0.1:8090",
  MEETING_FFMPEG_PATH: ffmpeg.replaceAll("\\", "/"),
  MEETING_STT_PYTHON: python.replaceAll("\\", "/"),
  MEETING_STT_MODEL_PATH: model.replaceAll("\\", "/"),
});
update(paths.communication, { MEETING_SUMMARY_ENABLED: "true" });
if (existsSync(paths.docker))
  update(paths.docker, {
    ...shared,
    MEETING_STT_URL: "http://speech-worker:8090",
    MEETING_FFMPEG_PATH: "ffmpeg",
  });
console.log(
  "Enabled meeting summaries in local AI, Communication and Docker AI configuration; configured local speech and allowed recording-storage host. Credentials were not printed.",
);

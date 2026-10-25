import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const backend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const project = resolve(backend, "project-service/.env");
const comm = resolve(backend, "communication-service/.env");
const local = resolve(backend, "communication-service/.env.local");
const files = [project, comm, ...(existsSync(local) ? [local] : [])];
if (files.some((file) => !existsSync(file)))
  throw Error("Configure Project and Communication service env files first");
const get = (text, key) =>
  text
    .match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]
    ?.trim()
    .replace(/^['"]|['"]$/g, "");
const current = files.map((file) => readFileSync(file, "utf8"));
const keys = [
  ...new Set(
    current.map((text) => get(text, "AI_PROJECT_SERVICE_KEY")).filter(Boolean),
  ),
];
if (keys.length > 1)
  throw Error("Project conversation keys differ; reconcile them first");
const key = keys[0] || randomBytes(32).toString("base64url");
if (key.length < 32)
  throw Error("AI_PROJECT_SERVICE_KEY must contain at least 32 characters");
for (let index = 0; index < files.length; index++) {
  let text = current[index];
  const values = { AI_PROJECT_SERVICE_KEY: key };
  if (files[index] !== project && !get(text, "PROJECT_SERVICE_URL"))
    values.PROJECT_SERVICE_URL = "http://localhost:8082";
  for (const [name, value] of Object.entries(values)) {
    const pattern = new RegExp(`^${name}=.*$`, "m");
    text = pattern.test(text)
      ? text.replace(pattern, `${name}=${value}`)
      : `${text.trimEnd()}\n${name}=${value}\n`;
  }
  writeFileSync(files[index], text);
}
console.log(
  "Conversation Project task access configured; dedicated key hidden. Restart Project and Communication services.",
);

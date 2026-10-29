import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(repo, "backend/ai-service/package.json"));
const { parse } = require("dotenv");
const ai = ["backend/ai-service/.env", "deploy/ai/.env"];
export const groups = {
  AI_GATEWAY_KEY: [...ai, "backend/kong-gateway/.env"],
  AI_DOCUMENT_SERVICE_KEY: [...ai, "backend/document-service/.env"],
  RAG_SERVICE_KEY: [...ai, "backend/rag-worker/.env"],
  AI_COMMUNICATION_SERVICE_KEY: [...ai, "backend/communication-service/.env"],
  WORK_ASSISTANT_SERVICE_KEY: [
    ...ai,
    "backend/project-service/.env",
    "backend/calendar-service/.env",
  ],
  MEETING_STT_SERVICE_KEY: [...ai],
};

export function planSecurity(root = repo) {
  const files = new Map(
    [...new Set(Object.values(groups).flat())].map((name) => {
      const path = resolve(root, name);
      const raw = readFileSync(path, "utf8");
      return [name, { path, raw, values: parse(raw) }];
    }),
  );
  const selected = new Map();
  for (const [name, targets] of Object.entries(groups)) {
    const existing = [
      ...new Set(
        targets.map((target) => files.get(target).values[name]).filter(Boolean),
      ),
    ];
    if (existing.length > 1)
      throw new Error(
        name + " differs between services; reconcile the intended key first",
      );
    if (existing[0] && existing[0].length < 32)
      throw new Error(name + " must contain at least 32 characters");
    selected.set(name, existing[0] || randomBytes(32).toString("base64url"));
  }
  if (new Set(selected.values()).size !== selected.size)
    throw new Error("Use a separate key for each AI service purpose");
  for (const [name, targets] of Object.entries(groups)) {
    for (const target of targets) {
      const file = files.get(target),
        value = selected.get(name);
      if (file.values[name] === value) continue;
      const pattern = new RegExp("^" + name + "=.*$", "gm");
      const newline = file.raw.includes("\r\n") ? "\r\n" : "\n";
      file.raw = pattern.test(file.raw)
        ? file.raw.replace(pattern, () => name + "=" + value)
        : file.raw +
          (file.raw && !file.raw.endsWith("\n") ? newline : "") +
          name +
          "=" +
          value +
          newline;
      file.values[name] = value;
    }
  }
  return files;
}
export function configureSecurity(root = repo) {
  // Validate all shared keys before writing any file; never rotate a configured key.
  const plan = planSecurity(root);
  let changed = 0;
  for (const file of plan.values()) {
    if (readFileSync(file.path, "utf8") !== file.raw) {
      writeFileSync(file.path, file.raw, "utf8");
      changed++;
    }
  }
  return changed;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    console.log(
      "Updated " +
        configureSecurity() +
        " AI configuration files; keys were not printed.",
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

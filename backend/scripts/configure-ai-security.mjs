import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, lstatSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(
  resolve(defaultRoot, "backend/ai-service/package.json"),
);
const { parse } = require("dotenv");
const ai = ["backend/ai-service/.env", "deploy/ai/.env"];
export const groups = {
  AI_GATEWAY_KEY: [...ai, "backend/kong-gateway/.env"],
  AI_DOCUMENT_SERVICE_KEY: [...ai, "backend/document-service/.env"],
  RAG_SERVICE_KEY: [...ai],
  CALENDAR_DOCUMENT_SERVICE_KEY: [
    "backend/calendar-service/.env",
    "backend/document-service/.env",
  ],
};

export function planSecurity(root = defaultRoot) {
  const files = new Map();
  for (const name of new Set(Object.values(groups).flat())) {
    const path = resolve(root, name);
    if (
      relative(root, path).startsWith("..") ||
      !existsSync(path) ||
      lstatSync(path).isSymbolicLink()
    )
      throw new Error(
        "Expected regular local env files; no configuration was changed",
      );
    const raw = readFileSync(path, "utf8");
    files.set(name, { path, raw, values: parse(raw), additions: [] });
  }
  for (const [name, targets] of Object.entries(groups)) {
    const existing = [
      ...new Set(
        targets
          .map((path) => files.get(path).values[name]?.trim())
          .filter(Boolean),
      ),
    ];
    if (existing.length > 1)
      throw new Error(
        `${name} differs between services; refusing to overwrite existing credentials`,
      );
    if (existing.length && !/^[A-Za-z0-9_-]{32,}$/.test(existing[0]))
      throw new Error(
        `${name} must be a strong base64url/hex key; existing values were preserved`,
      );
    const value = existing[0] || randomBytes(32).toString("base64url");
    for (const target of targets) {
      const file = files.get(target);
      if (!file.values[name]?.trim()) file.additions.push(`${name}=${value}`);
    }
  }
  return files;
}

export function configureSecurity(root = defaultRoot) {
  const files = planSecurity(root);
  // Preflight every file before the mechanical, additive env update.
  for (const file of files.values())
    if (readFileSync(file.path, "utf8") !== file.raw)
      throw new Error(
        "Configuration changed during setup; retry without overwriting it",
      );
  let changed = 0;
  for (const file of files.values()) {
    if (!file.additions.length) continue;
    const newline = file.raw.includes("\r\n") ? "\r\n" : "\n";
    // A blank earlier assignment is intentionally superseded by the last dotenv assignment.
    const addition = `${newline}# Dedicated service credentials (generated locally; never commit)${newline}${file.additions.join(newline)}${newline}`;
    writeFileSync(file.path, file.raw + addition, { mode: 0o600 });
    changed++;
  }
  return changed;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.argv.includes("--check")) {
      const files = planSecurity();
      const pending = [...files.values()].some((file) => file.additions.length);
      console.log(
        pending
          ? "Service credentials need provisioning; no values were printed."
          : "Service credentials are configured and consistent; no values were printed.",
      );
      if (pending) process.exitCode = 1;
    } else if (process.argv.includes("--apply")) {
      console.log(
        `Configured service credentials in ${configureSecurity()} env files. Existing credentials were preserved; no values were printed.`,
      );
    } else {
      console.log(
        "Usage: node backend/scripts/configure-ai-security.mjs --check|--apply",
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

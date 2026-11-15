import { createRequire } from "node:module";
import { resolve } from "node:path";
import {
  readEnvironment,
  REPOSITORY_ROOT,
} from "../local-security/env-files.mjs";
const require = createRequire(
  resolve(REPOSITORY_ROOT, "backend/ai-service/api/package.json"),
);
const { Client } = require("pg");
export async function openCopyDatabases() {
  const clients = {};
  for (const [name, directory] of Object.entries({
    document: "document-service",
    communication: "communication-service",
    ai: "ai-service/api",
  })) {
    const env = {
      ...readEnvironment(`backend/${directory}/.env`).values,
      ...readEnvironment(`backend/${directory}/.env.local`).values,
    };
    const url = new URL(env.DATABASE_URL);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)
    )
      throw new Error("Only local PostgreSQL databases are supported.");
    clients[name] = new Client({
      connectionString: url.toString(),
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
      application_name: "workspacehub-file-copy-maintenance",
    });
    clients[name].on("error", () => {});
  }
  const close = () =>
    Promise.allSettled(Object.values(clients).map((client) => client.end()));
  try {
    await Promise.all(Object.values(clients).map((client) => client.connect()));
  } catch (error) {
    await close();
    throw error;
  }
  return { ...clients, close };
}

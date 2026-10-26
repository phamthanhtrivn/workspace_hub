import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { AppModule } from "./app.module";
import { config } from "./config/env.config";
import { db } from "./infrastructure/database/database";
import { closeQueues } from "./infrastructure/queue/notebook.queue";
import type { Server } from "node:http";
import { createShutdownHandler, settleAll } from "./common/shutdown";
import { logError } from "./common/errors/error-log";
async function main() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "64kb" }));
  app.enableCors({ origin: config.FRONTEND_URL, credentials: true });
  await app.listen(config.PORT, config.BIND_HOST);
  const shutdown = createShutdownHandler(
    "api",
    async () => {
      try {
        // Stop accepting connections and let active requests finish while DB/Redis are open.
        await new Promise<void>((resolve, reject) => {
          const server: Server = app.getHttpServer();
          server.close((error) => (error ? reject(error) : resolve()));
        });
        await app.close();
      } finally {
        await settleAll([closeQueues(), db.end()]);
      }
    },
    config.AI_SHUTDOWN_TIMEOUT_MS,
  );
  for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, shutdown);
}
void main().catch((error) => {
  logError("ai_api_startup_failed", error);
  process.exitCode = 1;
});

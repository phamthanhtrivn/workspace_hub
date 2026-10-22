import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { AppModule } from "./app.module";
import { config } from "./config/env.config";
import { db } from "./infrastructure/database/database";
import { closeQueues } from "./infrastructure/queue/notebook.queue";
async function main() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "64kb" }));
  app.enableCors({ origin: config.FRONTEND_URL, credentials: true });
  app.enableShutdownHooks();
  await app.listen(config.PORT, config.BIND_HOST);
  let closing = false;
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      if (closing) return;
      closing = true;
      void Promise.all([closeQueues(), db.end()]).finally(() => app.close());
    });
}
void main().catch(() => {
  console.error(
    "Notebook API startup failed; check configuration and migrations",
  );
  process.exitCode = 1;
});

import "reflect-metadata";
import {
  Controller,
  Get,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { config } from "./config";
import { db } from "./db";
import { queue } from "./queue";
import { NotebookController } from "./controller";
import { Notebooks } from "./notebooks";
import { Chat } from "./chat";
import { AuthGuard } from "./auth";

@Controller()
class HealthController {
  @Get("health") health() {
    return {
      status: "ok",
      service: "notebook-ai",
      enabled: config.AI_ENABLED === "true",
    };
  }
  @Get("ready") async ready() {
    try {
      await db.query("SELECT id FROM notebook_ai.notebooks LIMIT 0");
      await queue.getJobCounts("waiting");
      const response = await fetch(`${config.RAG_WORKER_URL}/ready`, {
        headers: { "x-internal-service-key": config.RAG_SERVICE_KEY },
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      });
      if (!response.ok) throw new Error("RAG unavailable");
      return this.health();
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
@Module({
  controllers: [NotebookController, HealthController],
  providers: [Notebooks, Chat, AuthGuard],
})
class AppModule {}
async function main() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "64kb" }));
  app.enableCors({ origin: config.FRONTEND_URL, credentials: true });
  app.enableShutdownHooks();
  await app.listen(config.PORT, config.BIND_HOST);
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      void Promise.all([queue.close(), db.end()]).finally(() => app.close());
    });
}
void main().catch(() => {
  console.error(
    "Notebook API startup failed; check configuration and migrations",
  );
  process.exitCode = 1;
});

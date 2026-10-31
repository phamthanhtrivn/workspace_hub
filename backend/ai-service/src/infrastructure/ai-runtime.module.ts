import { Module } from "@nestjs/common";
import { SseTransport } from "../common/sse-transport";
import { AiDatabaseClient, aiDatabase } from "./database/ai-database.client";
import { AiQueueClient, aiQueues } from "./queue/ai-queue.client";
import { AiModelProvider, aiModels } from "./integrations/ai-model.provider";

@Module({
  providers: [
    SseTransport,
    { provide: AiDatabaseClient, useValue: aiDatabase },
    { provide: AiQueueClient, useValue: aiQueues },
    { provide: AiModelProvider, useValue: aiModels },
  ],
  exports: [SseTransport, AiDatabaseClient, AiQueueClient, AiModelProvider],
})
export class AiRuntimeModule {}

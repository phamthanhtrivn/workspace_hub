import { Injectable } from "@nestjs/common";
import {
  queue,
  summaryQueue,
  conversationQueue,
  meetingSummaryQueue,
  enqueue,
  findQueuedJob,
  closeQueues,
} from "./notebook.queue";

/** References existing queues; does not create workers or own a second connection set. */
@Injectable()
export class AiQueueClient {
  readonly jobs = queue;
  readonly summaries = summaryQueue;
  readonly conversations = conversationQueue;
  readonly meetingSummaries = meetingSummaryQueue;
  readonly enqueue = enqueue;
  readonly findQueuedJob = findQueuedJob;
  readonly close = closeQueues;
}

export const aiQueues = new AiQueueClient();

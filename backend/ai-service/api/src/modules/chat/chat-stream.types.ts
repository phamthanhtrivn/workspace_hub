import { Actor, Source, Snapshot } from "../../common/types";
import { ApplicationEventStream } from "../../common/sse-transport";
export type ChatStreamInput = {
  actor: Actor;
  notebookId: string;
  question: string;
  sourceIds: string[];
  requestId: string;
  stream: ApplicationEventStream;
  sources: Source[];
  controller: AbortController;
};

export type ChatGenerationInput = ChatStreamInput & {
  snapshot: Snapshot[];
  authorize: () => Promise<void>;
};

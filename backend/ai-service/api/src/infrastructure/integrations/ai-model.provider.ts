import { Injectable } from "@nestjs/common";
import { createChatModel } from "./chat-model";
import { modelAnswer } from "./llm.client";
import { retrieve, rag } from "./rag.client";

/** Keeps the existing model factory, admission limits and retry policy. */
@Injectable()
export class AiModelProvider {
  readonly createChatModel = createChatModel;
  readonly answer = modelAnswer;
  readonly retrieve = retrieve;
  readonly rag = rag;
}

export const aiModels = new AiModelProvider();

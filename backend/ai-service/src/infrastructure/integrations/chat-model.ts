import { ChatOpenAI } from "@langchain/openai";
import { config } from "../../config/env.config";

export function createChatModel(model: string, maxTokens: number) {
  return new ChatOpenAI({
    model,
    maxTokens,
    apiKey: config.LLM_API_KEY,
    configuration: { baseURL: config.LLM_BASE_URL.replace(/\/$/, "") },
    temperature: 0.1,
    timeout: config.LLM_TIMEOUT_MS,
    // An unknown provider outcome must never be replayed automatically.
    maxRetries: 0,
  });
}

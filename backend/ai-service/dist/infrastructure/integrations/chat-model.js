"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatModel = createChatModel;
const openai_1 = require("@langchain/openai");
const env_config_1 = require("../../config/env.config");
function createChatModel(model, maxTokens) {
    return new openai_1.ChatOpenAI({
        model,
        maxTokens,
        apiKey: env_config_1.config.LLM_API_KEY,
        configuration: { baseURL: env_config_1.config.LLM_BASE_URL.replace(/\/$/, "") },
        temperature: 0.1,
        timeout: env_config_1.config.LLM_TIMEOUT_MS,
        // An unknown provider outcome must never be replayed automatically.
        maxRetries: 0,
    });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.admitConversationModel = admitConversationModel;
const promises_1 = require("node:timers/promises");
const env_config_1 = require("../../config/env.config");
const model_quota_exception_1 = require("../../common/errors/model-quota.exception");
const llm_client_1 = require("../../infrastructure/integrations/llm.client");
// Only retry admission: a provider call with an unknown outcome must never be replayed.
async function admitConversationModel(tokens, model, signal) {
    const started = performance.now();
    const deadline = started + env_config_1.config.CONVERSATION_AI_QUOTA_WAIT_MS;
    let retries = 0;
    try {
        while (true) {
            signal.throwIfAborted();
            try {
                await (0, llm_client_1.admitModel)(tokens, model);
                return;
            }
            catch (error) {
                const remaining = deadline - performance.now();
                if (!(error instanceof model_quota_exception_1.ModelMinuteQuotaException) || remaining <= 0)
                    throw error;
                retries++;
                await (0, promises_1.setTimeout)(Math.min(error.retryAfterMs + Math.random() * 250, remaining), undefined, { signal });
            }
        }
    }
    finally {
        if (retries)
            console.info(JSON.stringify({
                event: "conversation_quota_wait",
                model,
                retries,
                duration_ms: Math.round(performance.now() - started),
                aborted: signal.aborted,
            }));
    }
}

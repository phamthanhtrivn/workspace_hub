"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureConversationStage = measureConversationStage;
async function measureConversationStage(stage, run) {
    const started = performance.now();
    let status = "failed";
    let usage;
    try {
        const result = await run();
        if (stage === "model") {
            const value = result;
            if (value?.usage_metadata) {
                const { input_tokens, output_tokens, total_tokens } = value.usage_metadata;
                usage = { input_tokens, output_tokens, total_tokens };
            }
        }
        status = "ok";
        return result;
    }
    finally {
        console.info(JSON.stringify({ event: "conversation_stage", stage, status,
            duration_ms: Math.round(performance.now() - started), usage }));
    }
}

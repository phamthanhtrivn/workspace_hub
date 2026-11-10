"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkHttpDependencies = checkHttpDependencies;
const env_config_1 = require("../../config/env.config");
async function checkHttpDependencies() {
    const results = await Promise.allSettled([
        fetch(`${env_config_1.config.RAG_WORKER_URL}/ready`, {
            headers: { "x-internal-service-key": env_config_1.config.RAG_SERVICE_KEY },
            signal: AbortSignal.timeout(3000),
            redirect: "error",
        }),
        ...(env_config_1.config.MEETING_SUMMARY_ENABLED === "true"
            ? [
                fetch(env_config_1.config.MEETING_STT_URL.replace(/\/$/, "") + "/ready", {
                    headers: {
                        "x-internal-service-key": env_config_1.config.MEETING_STT_SERVICE_KEY,
                    },
                    signal: AbortSignal.timeout(3000),
                    redirect: "error",
                }),
            ]
            : []),
        // A correctly authenticated malformed request reaches validation (400),
        // without accessing any user's documents or generating presigned URLs.
        fetch(`${env_config_1.config.DOCUMENT_SERVICE_URL}/internal/notebook-documents/resolve`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-internal-service-key": env_config_1.config.AI_DOCUMENT_SERVICE_KEY,
            },
            body: "{}",
            signal: AbortSignal.timeout(3000),
            redirect: "error",
        }),
    ]);
    const responses = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    try {
        if (responses.length !==
            (env_config_1.config.MEETING_SUMMARY_ENABLED === "true" ? 3 : 2) ||
            !responses[0].ok ||
            responses.at(-1)?.status !== 400 ||
            (env_config_1.config.MEETING_SUMMARY_ENABLED === "true" && !responses[1].ok))
            throw new Error("AI dependency unavailable or misconfigured");
    }
    finally {
        await Promise.all(responses.map((response) => response.body?.cancel()));
    }
}

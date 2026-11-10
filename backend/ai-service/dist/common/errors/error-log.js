"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = logError;
const SAFE_CODES = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EPIPE",
    "NR_CLOSED",
    "23505",
    "40001",
    "40P01",
    "53300",
    "57014",
    "57P01",
    "08000",
    "08001",
    "08003",
    "08006",
]);
function logError(event, error, context = {}) {
    const code = error?.code;
    // Messages, stacks and upstream bodies can contain prompts or credentials.
    console.error(JSON.stringify({
        event,
        ...context,
        error_type: error instanceof Error ? error.constructor.name : "UnknownError",
        ...(typeof code === "string" && SAFE_CODES.has(code)
            ? { error_code: code }
            : {}),
    }));
}

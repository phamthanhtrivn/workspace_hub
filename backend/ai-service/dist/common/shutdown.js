"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleAll = settleAll;
exports.createShutdownHandler = createShutdownHandler;
const error_log_1 = require("./errors/error-log");
async function settleAll(tasks) {
    const results = await Promise.allSettled(tasks);
    const errors = results.filter((result) => result.status === "rejected");
    if (errors.length)
        throw new AggregateError(errors.map((result) => result.reason));
}
function createShutdownHandler(service, drain, timeoutMs) {
    let shutdown;
    return () => {
        if (shutdown)
            return shutdown;
        const deadline = setTimeout(() => {
            (0, error_log_1.logError)("ai_shutdown_timeout", new Error(), {
                service,
                timeout_ms: timeoutMs,
            });
            // A hung job must not leave the container alive indefinitely. BullMQ retains its lock/state.
            process.exit(1);
        }, timeoutMs);
        shutdown = Promise.resolve()
            .then(drain)
            .catch((error) => {
            (0, error_log_1.logError)("ai_shutdown_failed", error, { service });
            process.exitCode = 1;
        })
            .finally(() => clearTimeout(deadline));
        return shutdown;
    };
}

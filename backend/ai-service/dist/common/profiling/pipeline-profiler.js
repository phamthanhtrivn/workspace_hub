"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profile = void 0;
exports.profiled = profiled;
class Profile {
    operation;
    started = performance.now();
    values = {};
    constructor(operation) {
        this.operation = operation;
    }
    set(stage, value) {
        if (Number.isFinite(value))
            this.values[stage] = Math.max(0, value);
    }
    async measure(stage, run) {
        const started = performance.now();
        try {
            return await run();
        }
        finally {
            this.set(stage, (this.values[stage] || 0) + performance.now() - started);
        }
    }
    finish(status) {
        const metrics = Object.fromEntries(Object.entries(this.values).map(([key, value]) => [
            key,
            Math.round(value * 100) / 100,
        ]));
        console.info(JSON.stringify({
            event: "ai_pipeline",
            operation: this.operation,
            status,
            ...metrics,
            total_ms: Math.round((performance.now() - this.started) * 100) / 100,
        }));
    }
}
exports.Profile = Profile;
async function profiled(operation, run) {
    const timing = new Profile(operation);
    try {
        const result = await run(timing);
        timing.finish("ok");
        return result;
    }
    catch (error) {
        timing.finish("failed");
        throw error;
    }
}

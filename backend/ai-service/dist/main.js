"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const express_1 = require("express");
const app_module_1 = require("./app.module");
const env_config_1 = require("./config/env.config");
const database_1 = require("./infrastructure/database/database");
const notebook_queue_1 = require("./infrastructure/queue/notebook.queue");
const shutdown_1 = require("./common/shutdown");
const error_log_1 = require("./common/errors/error-log");
async function main() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bodyParser: false });
    app.use((0, express_1.json)({ limit: "64kb" }));
    app.enableCors({ origin: env_config_1.config.FRONTEND_URL, credentials: true });
    await app.listen(env_config_1.config.PORT, env_config_1.config.BIND_HOST);
    const shutdown = (0, shutdown_1.createShutdownHandler)("api", async () => {
        try {
            // Stop accepting connections and let active requests finish while DB/Redis are open.
            await new Promise((resolve, reject) => {
                const server = app.getHttpServer();
                server.close((error) => (error ? reject(error) : resolve()));
            });
            await app.close();
        }
        finally {
            await (0, shutdown_1.settleAll)([(0, notebook_queue_1.closeQueues)(), database_1.db.end()]);
        }
    }, env_config_1.config.AI_SHUTDOWN_TIMEOUT_MS);
    for (const signal of ["SIGTERM", "SIGINT"])
        process.on(signal, shutdown);
}
void main().catch((error) => {
    (0, error_log_1.logError)("ai_api_startup_failed", error);
    process.exitCode = 1;
});

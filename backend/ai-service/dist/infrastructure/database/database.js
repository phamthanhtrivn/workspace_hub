"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.rows = rows;
exports.transaction = transaction;
const pg_1 = require("pg");
const env_config_1 = require("../../config/env.config");
exports.db = new pg_1.Pool({
    connectionString: env_config_1.config.DATABASE_URL,
    max: 12,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
});
exports.db.on("error", () => console.error("Notebook PostgreSQL connection unavailable"));
async function rows(sql, args = []) {
    return (await exports.db.query(sql, args)).rows;
}
async function transaction(run) {
    const client = await exports.db.connect();
    try {
        await client.query("BEGIN");
        const result = await run(client);
        await client.query("COMMIT");
        return result;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}

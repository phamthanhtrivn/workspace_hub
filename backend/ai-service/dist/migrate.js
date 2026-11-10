"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const database_1 = require("./infrastructure/database/database");
void database_1.db
    .query((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, "../migrations/001_notebooks.sql"), "utf8"))
    .then(() => database_1.db.query((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, "../migrations/002_meeting_summaries.sql"), "utf8")))
    .then(() => database_1.db.query((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, "../migrations/003_work_assistant.sql"), "utf8")))
    .then(() => database_1.db.query((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, "../migrations/004_work_assistant_conversations.sql"), "utf8")))
    .then(() => database_1.db.query((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, "../migrations/005_ai_performance.sql"), "utf8")))
    .then(() => console.log("Notebook schema ready (legacy tables untouched)"))
    .catch(() => {
    console.error("Migration failed; check database and credentials");
    process.exitCode = 1;
})
    .finally(() => database_1.db.end());

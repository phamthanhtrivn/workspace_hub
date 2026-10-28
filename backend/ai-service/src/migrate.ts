import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "./infrastructure/database/database";
void db
  .query(
    readFileSync(join(__dirname, "../migrations/001_notebooks.sql"), "utf8"),
  )
  .then(() =>
    db.query(
      readFileSync(
        join(__dirname, "../migrations/002_meeting_summaries.sql"),
        "utf8",
      ),
    ),
  )
  .then(() =>
    db.query(
      readFileSync(
        join(__dirname, "../migrations/003_work_assistant.sql"),
        "utf8",
      ),
    ),
  )
  .then(() =>
    db.query(
      readFileSync(
        join(__dirname, "../migrations/004_work_assistant_conversations.sql"),
        "utf8",
      ),
    ),
  )
  .then(() =>
    db.query(
      readFileSync(
        join(__dirname, "../migrations/005_ai_performance.sql"),
        "utf8",
      ),
    ),
  )
  .then(() => console.log("Notebook schema ready (legacy tables untouched)"))
  .catch(() => {
    console.error("Migration failed; check database and credentials");
    process.exitCode = 1;
  })
  .finally(() => db.end());

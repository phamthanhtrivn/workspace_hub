import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "./db";
void db
  .query(
    readFileSync(join(__dirname, "../migrations/001_notebooks.sql"), "utf8"),
  )
  .then(() => console.log("Notebook schema ready (legacy tables untouched)"))
  .catch(() => {
    console.error("Migration failed; check database and credentials");
    process.exitCode = 1;
  })
  .finally(() => db.end());

import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  connect,
  identifier,
  loadDatabasePlan,
  DATABASE_PLAN_PATH,
} from "../local-security/database-plan.mjs";
import { REPOSITORY_ROOT } from "../local-security/env-files.mjs";
import {
  purgeChatCards,
  purgeLinkedSources,
} from "../purge-legacy-file-references.mjs";
import { clearApplicationTables, resetQdrant } from "../reset-local-workspace.mjs";

const enabled =
  process.env.WORKSPACEHUB_FILE_COPY_DB_TESTS === "1" &&
  existsSync(resolve(REPOSITORY_ROOT, DATABASE_PLAN_PATH));

/** All SQL, including the command's commits, stays inside a rolled-back sample schema. */
async function withSample(run) {
  const { admin } = loadDatabasePlan();
  assert.ok(["127.0.0.1", "localhost", "::1"].includes(admin.host));
  const db = await connect(admin);
  const schema = `wh_copy_test_${randomUUID().replaceAll("-", "")}`;
  const client = {
    query(sql, values) {
      if (/^BEGIN/.test(sql)) return db.query("SAVEPOINT cleanup_command");
      if (sql === "COMMIT")
        return db.query("RELEASE SAVEPOINT cleanup_command");
      if (sql === "ROLLBACK")
        return db.query("ROLLBACK TO SAVEPOINT cleanup_command");
      return db.query(
        sql.replaceAll("notebook_ai.", `${identifier(schema)}.`)
          .replace("schemaname IN ('public','notebook_ai')", `schemaname='${schema}'`),
        values,
      );
    },
  };
  try {
    await db.query("BEGIN");
    await db.query(`CREATE SCHEMA ${identifier(schema)}`);
    await db.query(`SET LOCAL search_path TO ${identifier(schema)}`);
    await run(db, client);
  } finally {
    await db.query("ROLLBACK");
    assert.equal(
      (await db.query("SELECT 1 FROM pg_namespace WHERE nspname=$1", [schema]))
        .rowCount,
      0,
    );
    await db.end();
  }
}

test("full local data cleanup preserves schemas and every migration history", { skip: !enabled }, async () => {
  await withSample(async (db, client) => {
    await db.query(`CREATE TABLE app_records(id serial PRIMARY KEY);
      CREATE TABLE app_children(id serial PRIMARY KEY,parent_id int REFERENCES app_records(id));
      INSERT INTO app_records DEFAULT VALUES; INSERT INTO app_children(parent_id) VALUES(1);`);
    const histories = ['_prisma_migrations', 'flyway_schema_history', 'workspacehub_schema_history', 'workspacehub_local_security_history', 'schema_migrations'];
    for (const table of histories) {
      await db.query(`CREATE TABLE ${identifier(table)}(name text); INSERT INTO ${identifier(table)} VALUES('retained')`);
    }
    assert.equal(await clearApplicationTables(client), 2);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM app_records')).rows[0].n, 0);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM app_children')).rows[0].n, 0);
    assert.equal((await db.query('INSERT INTO app_records DEFAULT VALUES RETURNING id')).rows[0].id, 1);
    for (const table of histories) assert.equal((await db.query(`SELECT name FROM ${identifier(table)}`)).rows[0].name, 'retained');
  });
});

test("Qdrant reset uses the current Compose RAG container and includes source manifests", async () => {
  for (const apply of [false, true]) {
    const report = await resetQdrant({ apply, capture: async (args) => {
      assert.equal(args[0], 'compose');
      assert.ok(args[2].endsWith(resolve('backend/docker/compose.yml')));
      assert.deepEqual(args.slice(3, 8), ['exec', '-T', 'rag-worker', 'python', '-c']);
      assert.ok(args[8].includes('wh_notebook_manifests_v1'));
      assert.ok(args[8].includes(`if ${apply ? 'True' : 'False'}:`));
      return JSON.stringify({ qdrantWorkspaceCollections: 2, removed: apply });
    } });
    assert.equal(report.removed, apply);
  }
});

test(
  "legacy chat cleanup preserves ordinary replies, normal attachments and replay receipts",
  { skip: !enabled },
  async () => {
    await withSample(async (db, client) => {
      for (const [table, media] of [
        ["messages", "medias"],
        ["direct_messages", "direct_medias"],
      ]) {
        await db.query(`CREATE TABLE ${table} (
        id uuid PRIMARY KEY, type text NOT NULL, content text, recalled boolean DEFAULT false,
        pinned boolean DEFAULT false, thread_parent_id uuid REFERENCES ${table}(id) ON DELETE CASCADE,
        thread_reply_count int DEFAULT 0, thread_last_reply_at timestamptz,
        created_at timestamptz DEFAULT now(), deleted_at timestamptz
      ); CREATE TABLE ${media}(id uuid PRIMARY KEY,message_id uuid REFERENCES ${table}(id) ON DELETE CASCADE)`);
        const [
          root,
          legacyChild,
          ordinaryReply,
          standaloneCard,
          ordinaryRoot,
          removedReply,
        ] = Array.from({ length: 6 }, randomUUID);
        await db.query(
          `INSERT INTO ${table}(id,type,content,thread_parent_id) VALUES
        ($1,'DOCUMENT','old payload',NULL),($2,'DOCUMENT','old payload',$1),
        ($3,'TEXT','keep this reply',$2),($4,'DOCUMENT','old payload',NULL),
        ($5,'TEXT','normal root',NULL),($6,'DOCUMENT','old payload',$5)`,
          [
            root,
            legacyChild,
            ordinaryReply,
            standaloneCard,
            ordinaryRoot,
            removedReply,
          ],
        );
        await db.query(`INSERT INTO ${media} VALUES($1,$2),($3,$4)`, [
          randomUUID(),
          root,
          randomUUID(),
          ordinaryReply,
        ]);
      }
      await db.query(
        "CREATE TABLE message_delivery_receipts(id uuid PRIMARY KEY)",
      );
      await db.query("INSERT INTO message_delivery_receipts VALUES($1)", [
        randomUUID(),
      ]);
      const before = await purgeChatCards(client, false);
      assert.deepEqual(before.channel, {
        cards: 4,
        deleted: 2,
        threadPlaceholders: 2,
      });
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM messages WHERE type='DOCUMENT'",
          )
        ).rows[0].n,
        4,
      );
      const applied = await purgeChatCards(client, true);
      assert.deepEqual(applied, before);
      for (const [table, media] of [
        ["messages", "medias"],
        ["direct_messages", "direct_medias"],
      ]) {
        assert.equal(
          (await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n,
          4,
        );
        assert.equal(
          (
            await db.query(
              `SELECT count(*)::int AS n FROM ${table} WHERE recalled AND content IS NULL AND type='TEXT'`,
            )
          ).rows[0].n,
          2,
        );
        assert.equal(
          (await db.query(`SELECT count(*)::int AS n FROM ${media}`)).rows[0].n,
          1,
        );
        assert.equal(
          (
            await db.query(
              `SELECT thread_reply_count FROM ${table} WHERE content='normal root'`,
            )
          ).rows[0].thread_reply_count,
          0,
        );
      }
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM message_delivery_receipts",
          )
        ).rows[0].n,
        1,
      );
      assert.equal((await purgeChatCards(client, true)).channel.cards, 0);
    });
  },
);

test(
  "Notebook cleanup removes only linked sources and atomically queues their index cleanup",
  { skip: !enabled },
  async () => {
    await withSample(async (db, client) => {
      await db.query(`CREATE TABLE notebooks(id uuid PRIMARY KEY);
      CREATE TABLE sources(id uuid PRIMARY KEY,notebook_id uuid REFERENCES notebooks(id),snapshot_id uuid);
      CREATE TABLE cleanup_outbox(id uuid PRIMARY KEY,scope_id uuid NOT NULL,source_id uuid,snapshot_cleanup jsonb NOT NULL DEFAULT '[]');
      CREATE TABLE notes(id uuid PRIMARY KEY,notebook_id uuid REFERENCES notebooks(id));`);
      const [book, legacy, copied, snapshot, note] = Array.from(
        { length: 5 },
        randomUUID,
      );
      await db.query("INSERT INTO notebooks VALUES($1)", [book]);
      await db.query("INSERT INTO sources VALUES($1,$2,NULL),($3,$2,$4)", [
        legacy,
        book,
        copied,
        snapshot,
      ]);
      await db.query("INSERT INTO notes VALUES($1,$2)", [note, book]);
      assert.deepEqual(await purgeLinkedSources(client, false), {
        sources: 1,
        notebooksRetained: 1,
      });
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM sources")).rows[0].n,
        2,
      );
      await purgeLinkedSources(client, true);
      assert.deepEqual(
        (await db.query("SELECT id FROM sources")).rows.map((row) => row.id),
        [copied],
      );
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM notebooks")).rows[0].n,
        1,
      );
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM notes")).rows[0].n,
        1,
      );
      assert.deepEqual(
        (
          await db.query(
            "SELECT scope_id,source_id,snapshot_cleanup FROM cleanup_outbox",
          )
        ).rows,
        [{ scope_id: book, source_id: legacy, snapshot_cleanup: [] }],
      );
      assert.equal((await purgeLinkedSources(client, true)).sources, 0);
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM cleanup_outbox"))
          .rows[0].n,
        1,
      );
    });
  },
);

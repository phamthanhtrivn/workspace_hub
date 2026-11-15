const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createSourceLoader } = require("../../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));
const { notebookListQuery, notebookListSql } = load("src/modules/notebooks/notebook-list.ts");

test("notebook pagination validates bounds, trims search and rejects unsafe sort values", () => {
  assert.deepEqual(notebookListQuery.parse({}), { page: 1, limit: 12, search: "", sort: "updated_desc" });
  assert.equal(notebookListQuery.parse({ page: "11", search: "  research %  " }).search, "research %");
  for (const invalid of [{ page: 0 }, { page: "x" }, { page: 1.5 }, { limit: 1000 }, { sort: "title; DROP TABLE notebooks" }, { search: "x".repeat(201) }])
    assert.equal(notebookListQuery.safeParse(invalid).success, false);
});

test("the list query keeps account/search values parameterized and uses deterministic ordering", async () => {
  let captured;
  const { NotebooksService } = load("src/modules/notebooks/notebooks.service.ts", {
    "../../infrastructure/database/database": { rows: async (sql, args) => {
      captured = { sql, args };
      return [{ items: [{ id: "private-notebook", title: "Research" }], page: 2, total: 13, total_pages: 2 }];
    } },
    "../../common/auth/notebook-access": {},
    "../sources/sources.service": { SourcesService: class {} },
    "../../common/delete-source": {},
    "./notebook-messages": {},
  });
  const service = new NotebooksService({});
  const params = notebookListQuery.parse({ page: 99, search: "%' OR true --", sort: "title_asc" });
  const page = await service.list({ id: "owner" }, params);
  assert.deepEqual(captured.args, ["owner", "%' OR true --", 12, 99]);
  assert.match(captured.sql, /WHERE owner_id = \$1/);
  assert.match(captured.sql, /lower\(title\) ASC, id ASC/);
  assert.ok(!captured.sql.includes(params.search));
  assert.deepEqual(page.meta, { page: 2, limit: 12, total: 13, totalPages: 2 });
  assert.equal(page.data.length, 1);
  assert.match(notebookListSql("updated_desc"), /updated_at DESC, id DESC/);
});

test("invalid pagination is rejected at the controller before querying notebooks", async () => {
  const { NotebooksController } = load("src/modules/notebooks/notebooks.controller.ts", {
    "./notebooks.service": { NotebooksService: class {} },
    "../../common/auth/auth.guard": { AuthGuard: class {} },
  });
  let queries = 0;
  const controller = new NotebooksController({ list: () => { queries++; } });
  await assert.rejects(controller.list({ actor: { id: "owner" } }, { page: -1 }));
  assert.equal(queries, 0);
});

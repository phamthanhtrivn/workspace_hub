const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createSourceLoader } = require("../../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));
const { createNotebookInput, updateNotebookInput } = load("src/modules/notebooks/notebook-input.ts");

test("notebook metadata validates limits, allowed themes and legacy title-only requests", () => {
  assert.deepEqual(createNotebookInput.parse({ title: " Research " }), { title: "Research", description: "", category: "", color_theme: "navy" });
  assert.deepEqual(updateNotebookInput.parse({ title: " New title " }), { title: "New title" });
  assert.deepEqual(updateNotebookInput.parse({ description: "", category: "" }), { description: "", category: "" });
  for (const input of [{ title: " " }, { description: "x".repeat(1001) }, { category: "x".repeat(51) }, { color_theme: "custom-css" }, { owner_id: "another-owner" }, {}, { color_theme: null }]) {
    assert.equal(updateNotebookInput.safeParse(input).success, false);
  }
});

function serviceHarness(owned = async () => ({})) {
  const calls = [];
  const { NotebooksService } = load("src/modules/notebooks/notebooks.service.ts", {
    "../../infrastructure/database/database": { rows: async (sql, args) => { calls.push({ sql, args }); return [{ id: "notebook" }]; } },
    "../../common/auth/notebook-access": { ownedNotebook: owned },
    "../sources/sources.service": { SourcesService: class {} },
    "../../common/delete-source": {}, "./notebook-messages": {},
  });
  return { service: new NotebooksService({}), calls };
}

test("creating notebooks persists trimmed metadata with the authenticated owner", async () => {
  const { service, calls } = serviceHarness();
  const input = createNotebookInput.parse({ title: " Research ", description: " Interview findings ", category: " Academic ", color_theme: "emerald" });
  await service.create({ id: "owner" }, input);
  assert.deepEqual(calls[0].args.slice(1), ["owner", "Research", "Interview findings", "Academic", "emerald"]);
});

test("editing notebook details checks ownership and preserves omitted fields", async () => {
  let authorization;
  const { service, calls } = serviceHarness(async (actor, id) => { authorization = [actor.id, id]; });
  await service.update({ id: "owner" }, "notebook", updateNotebookInput.parse({ title: "Renamed" }));
  assert.deepEqual(authorization, ["owner", "notebook"]);
  assert.deepEqual(calls[0].args, ["notebook", "owner", "Renamed", undefined, undefined, undefined]);
  assert.match(calls[0].sql, /description=coalesce\(\$4,description\)/);
  assert.match(calls[0].sql, /WHERE id=\$1 AND owner_id=\$2/);
  await service.update({ id: "owner" }, "notebook", updateNotebookInput.parse({ description: "", category: "", color_theme: "sky" }));
  assert.deepEqual(calls[1].args.slice(2), [undefined, "", "", "sky"]);
  const denied = serviceHarness(async () => { throw new Error("not found"); });
  await assert.rejects(denied.service.update({ id: "outsider" }, "notebook", { title: "No" }), /not found/);
  assert.equal(denied.calls.length, 0);
});

test("invalid metadata is rejected by the controller before mutations", async () => {
  let writes = 0;
  const { NotebooksController } = load("src/modules/notebooks/notebooks.controller.ts", {
    "./notebooks.service": { NotebooksService: class {} },
    "../../common/auth/auth.guard": { AuthGuard: class {} },
  });
  const controller = new NotebooksController({ create: () => writes++, update: () => writes++ });
  await assert.rejects(controller.create({ actor: { id: "owner" } }, { title: "Research", color_theme: "invalid" }));
  await assert.rejects(controller.update({ actor: { id: "owner" } }, "id", { category: "x".repeat(51) }));
  assert.equal(writes, 0);
});

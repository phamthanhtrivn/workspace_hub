const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  visibleSnapshot,
  selectSources,
  citeEvidence,
  validateCitations,
  summaryGroups,
} = require("../dist/common/evidence-policy");
const source = {
  id: "one",
  revision: "r1",
  status: "READY",
  name: "test.md",
  document_id: "document",
  version_id: "v1",
};

test("background artifacts use their saved snapshot, never newly added notebook sources", () => {
  const { snapshotSources } = require("../dist/common/evidence-policy");
  const added = { ...source, id: "later-source", revision: "r2" };
  assert.deepEqual(
    snapshotSources(
      [{ id: source.id, revision: source.revision }],
      [source, added],
    ),
    [source],
  );
  assert.throws(() =>
    snapshotSources([{ id: "gone", revision: "r1" }], [source]),
  );
});

test("snapshots fail closed after removal, revocation, pending index or version change", () => {
  assert.equal(
    visibleSnapshot([{ id: "one", revision: "r1" }], [source]),
    true,
  );
  for (const changed of [
    [],
    [{ ...source, status: "UNAVAILABLE" }],
    [{ ...source, revision: "r2" }],
    [{ ...source, status: "QUEUED" }],
  ]) {
    assert.equal(
      visibleSnapshot([{ id: "one", revision: "r1" }], changed),
      false,
    );
  }
  assert.equal(visibleSnapshot([], []), true); // Manual notes do not acquire document dependencies.
});
test("selection rejects cross-notebook IDs, duplicates and empty selection", () => {
  for (const ids of [[], ["other"], ["one", "one"], Array(6).fill("one")])
    assert.throws(() => selectSources(ids, [source]));
  assert.deepEqual(selectSources(["one"], [source]), [source]);
});
test("citation names and versions come from authorized metadata, not model output", () => {
  const evidence = citeEvidence(
    [{ id: "chunk", sourceId: "one", text: "Evidence", position: 0 }],
    [source],
  );
  assert.equal(evidence[0].documentId, "document");
  assert.deepEqual(validateCitations("Supported [[S1]]", evidence), evidence);
  for (const text of [
    "No citations",
    "Invented [[S99]]",
    "Valid [[S1]] but invented [[S2]]",
  ])
    assert.throws(() => validateCitations(text, evidence));
  assert.throws(() =>
    citeEvidence([{ sourceId: "other", text: "secret" }], [source]),
  );
});
test("whole-text summary grouping preserves every chunk in order", () => {
  const chunks = Array.from({ length: 31 }, (_, i) => ({
    id: String(i),
    text: "ý".repeat(2000),
  }));
  const groups = summaryGroups(chunks);
  assert.ok(groups.length > 1);
  assert.deepEqual(
    groups.flat().map((c) => c.id),
    chunks.map((c) => c.id),
  );
  assert.throws(() => summaryGroups([]));
});

test("summary batches never combine different files", () => {
  const chunks = [
    { sourceId: "a", text: "a" },
    { sourceId: "a", text: "b" },
    { sourceId: "b", text: "c" },
  ];
  const groups = summaryGroups(chunks);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.flat(), chunks);
  assert.ok(
    groups.every(
      (group) => new Set(group.map((item) => item.sourceId)).size === 1,
    ),
  );
});

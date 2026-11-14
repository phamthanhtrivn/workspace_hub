import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { discoverTests } from "./discovery.mjs";

test("unit discovery includes source TS/TSX/CJS/MJS and excludes infrastructure and generated output", () => {
  const prefix = join(tmpdir(), "workspacehub-test-discovery-");
  const root = mkdtempSync(prefix);
  try {
    for (const name of ["app/src/service.spec.ts", "app/features/form.spec.tsx", "app/features/policy.spec.cjs", "app/hooks/recorder.spec.mjs", "app/src/dist/old.spec.ts", "app/node_modules/foreign.spec.ts", "app/tests/integration/db.test.cjs", "tests/system/socket.test.mjs", "tests/system/security.integration.test.mjs"]) {
      const file = join(root, name); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, "");
    }
    const project = join(root, "app");
    assert.equal(discoverTests(project, "unit", root).length, 4);
    assert.deepEqual(discoverTests(project, "integration", root).map(file => relative(project, file).replaceAll("\\", "/")), ["tests/integration/db.test.cjs"]);
    assert.equal(discoverTests(root, "system", root).length, 1);
    assert.equal(discoverTests(root, "integration", root).length, 1);
  } finally {
    assert.ok(root.startsWith(prefix)); rmSync(root, { recursive: true, force: true });
  }
});

test("projects without integration tests have an empty explicit suite", () => {
  assert.deepEqual(discoverTests("/not-a-test-project", "integration", "/not-a-repository"), []);
});

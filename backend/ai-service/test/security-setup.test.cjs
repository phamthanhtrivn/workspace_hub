const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} = require("node:fs");
const { join, dirname } = require("node:path");
const { tmpdir } = require("node:os");

test("credential provisioning is consistent, idempotent and preserves unrelated env values", async (t) => {
  const { groups, configureSecurity, planSecurity } =
    await import("../../scripts/configure-ai-security.mjs");
  const root = mkdtempSync(join(tmpdir(), "workspace-security-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const names = [...new Set(Object.values(groups).flat())];
  const initial =
    "INTERNAL_SERVICE_KEY=fixture-existing-legacy-key\nLLM_API_KEY=fixture-existing-model-key\n";
  for (const name of names) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), initial);
  }
  assert.equal(configureSecurity(root), names.length);
  const configured = planSecurity(root);
  const purposeKeys = [];
  for (const [name, targets] of Object.entries(groups)) {
    const values = targets.map((target) => configured.get(target).values[name]);
    assert.equal(new Set(values).size, 1);
    assert.match(values[0], /^[A-Za-z0-9_-]{43}$/);
    purposeKeys.push(values[0]);
  }
  assert.equal(new Set(purposeKeys).size, Object.keys(groups).length);
  assert.equal(configureSecurity(root), 0);
  for (const file of configured.values()) {
    assert.ok(file.raw.startsWith(initial));
    assert.equal(readFileSync(file.path, "utf8"), file.raw);
  }
  const conflict = join(root, "backend/kong-gateway/.env");
  writeFileSync(
    conflict,
    initial + "AI_GATEWAY_KEY=fixture-conflicting-key-not-production-000\n",
  );
  assert.throws(() => configureSecurity(root), /differs between services/);
  for (const file of configured.values()) {
    if (file.path !== conflict)
      assert.equal(readFileSync(file.path, "utf8"), file.raw);
  }
});

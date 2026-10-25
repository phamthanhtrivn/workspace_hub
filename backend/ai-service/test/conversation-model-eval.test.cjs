const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  gradeSchedule,
  cases,
} = require("../scripts/conversation-model-cases.cjs");
const valid = {
  gio_som_nhat: 12,
  lich: [
    { cong_viec: "A", bat_dau: 0, ket_thuc: 3 },
    { cong_viec: "B", bat_dau: 3, ket_thuc: 8 },
    { cong_viec: "C", bat_dau: 3, ket_thuc: 5 },
    { cong_viec: "D", bat_dau: 8, ket_thuc: 12 },
  ],
};
test("evaluation accepts a valid optimal schedule and fenced JSON", () => {
  assert.ok(Object.values(gradeSchedule(JSON.stringify(valid))).every(Boolean));
  assert.ok(
    Object.values(
      gradeSchedule("```json\n" + JSON.stringify(valid) + "\n```"),
    ).every(Boolean),
  );
});
test("evaluation rejects violated dependencies, duration and incomplete schedules", () => {
  const bad = structuredClone(valid);
  bad.lich[3].bat_dau = 7;
  bad.lich[3].ket_thuc = 11;
  assert.equal(gradeSchedule(JSON.stringify(bad)).feasibleSchedule, false);
  const wrongDuration = structuredClone(valid);
  wrongDuration.lich[1].ket_thuc = 7;
  assert.equal(
    gradeSchedule(JSON.stringify(wrongDuration)).feasibleSchedule,
    false,
  );
  const duplicate = structuredClone(valid);
  duplicate.lich[2] = duplicate.lich[1];
  assert.equal(
    gradeSchedule(JSON.stringify(duplicate)).feasibleSchedule,
    false,
  );
});
test("malformed model JSON and null fields yield failed checks without crashing the report", () => {
  for (const answer of [
    "not JSON",
    "null",
    "[]",
    "{}",
    JSON.stringify({ gio_som_nhat: 12, lich: [null, null, null, null] }),
  ]) {
    assert.ok(!Object.values(gradeSchedule(answer)).every(Boolean));
  }
});
test("summary case retains valid Vietnamese UTF-8 and requires scoped history", () => {
  assert.equal(cases[0].question, "tóm tắt hội thoại");
  assert.equal(
    cases[0].grade(
      "Minh lo giao diện. Demo thứ Hai 09:00. API chưa có người sửa.",
      1,
    ).latestDemo,
    true,
  );
  assert.equal(
    cases[0].grade(
      "Minh lo giao diện. Demo thứ Hai 09:00. API chưa có người sửa.",
      0,
    ).readHistory,
    false,
  );
});

test("an unwritable or missing output directory fails before config loading or paid model calls", () => {
  const { spawnSync } = require("node:child_process");
  const { join } = require("node:path");
  const missing = join(
    __dirname,
    "missing-evaluation-directory",
    "report.json",
  );
  const result = spawnSync(
    process.execPath,
    [
      join(__dirname, "../scripts/evaluate-conversation-model.cjs"),
      "--run",
      "--out",
      missing,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DOTENV_CONFIG_PATH: "test/no-env",
        LLM_BASE_URL: "https://provider.invalid/v1",
      },
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENOENT/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { filterTimezoneOptions, timezoneOptions } from "./timezone-options";

test("timezone search matches city words, IANA names and UTC offsets without leading zeroes", () => {
  const options = timezoneOptions(
    "Asia/Ho_Chi_Minh",
    new Date("2026-11-22T00:00:00Z"),
  );
  for (const query of [
    "ho chi minh",
    "ASIA/HO_CHI_MINH",
    "utc+7",
    "UTC+07:00",
  ]) {
    assert.ok(
      filterTimezoneOptions(options, query).some(
        (option) => option.value === "Asia/Ho_Chi_Minh",
      ),
    );
  }
  assert.deepEqual(filterTimezoneOptions(options, "not-a-timezone"), []);
  assert.equal(filterTimezoneOptions(options, "  ").length, options.length);
  assert.equal(options[0].value, "Asia/Ho_Chi_Minh");
  assert.equal(options.filter((option) => option.value === "UTC").length, 1);
});

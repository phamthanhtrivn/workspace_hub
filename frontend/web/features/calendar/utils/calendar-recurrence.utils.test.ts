import { describe, expect, it } from "vitest";
import { CALENDAR_RECURRENCE_PRESET_VALUES } from "../types/calendar.constants";
import {
  buildCustomRecurrenceRule,
  formatRecurrenceRuleText,
  getPresetRecurrenceRule,
  getRecurrencePresetFromRule,
  getWeekdayNameByCode,
  parseCustomRecurrenceRule,
} from "./calendar-recurrence.utils";

describe("calendar recurrence utilities", () => {
  const monday = new Date("2026-08-31T09:00:00.000Z");
  const sunday = new Date("2026-09-06T11:30:00.000Z");

  it("serializes and recognizes a weekly preset", () => {
    const rule = getPresetRecurrenceRule(
      CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY,
      monday,
    );

    expect(rule).toBe("FREQ=WEEKLY;INTERVAL=1;BYDAY=MO");
    expect(getRecurrencePresetFromRule(rule, monday)).toBe(
      CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY,
    );
  });

  it("round-trips a custom weekday rule with a count", () => {
    const rule = buildCustomRecurrenceRule({
      frequency: "WEEKLY",
      interval: 2,
      weekdays: ["MO", "WE"],
      endType: "after",
      count: 4,
    });

    expect(parseCustomRecurrenceRule(rule, monday)).toEqual({
      frequency: "WEEKLY",
      interval: 2,
      weekdays: ["MO", "WE"],
      endType: "after",
      count: 4,
    });
    expect(getRecurrencePresetFromRule(rule, monday)).toBe(
      CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM,
    );
  });

  it("returns a safe fallback for malformed rules", () => {
    expect(parseCustomRecurrenceRule("not-an-rrule", monday)).toEqual({
      frequency: "WEEKLY",
      interval: 1,
      weekdays: ["MO"],
      endType: "never",
    });
  });

  it("formats weekday codes correctly in vi and en", () => {
    expect(getWeekdayNameByCode("SU", "vi")).toBe("Chủ Nhật");
    expect(getWeekdayNameByCode("MO", "vi")).toBe("Thứ Hai");
    expect(getWeekdayNameByCode("SU", "en")).toBe("Sunday");
    expect(getWeekdayNameByCode("MO", "en")).toBe("Monday");
  });

  it("formats recurring rules in Vietnamese and English", () => {
    // Daily
    expect(formatRecurrenceRuleText("FREQ=DAILY;INTERVAL=1", "vi")).toBe(
      "Hàng ngày",
    );
    expect(formatRecurrenceRuleText("FREQ=DAILY;INTERVAL=1", "en")).toBe(
      "Daily",
    );
    expect(formatRecurrenceRuleText("FREQ=DAILY;INTERVAL=3", "vi")).toBe(
      "Mỗi 3 ngày",
    );

    // Weekdays
    expect(
      formatRecurrenceRuleText(
        "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR",
        "vi",
      ),
    ).toBe("Mọi ngày trong tuần (từ Thứ Hai đến Thứ Sáu)");

    // Weekly single day
    expect(
      formatRecurrenceRuleText("FREQ=WEEKLY;INTERVAL=1;BYDAY=SU", "vi"),
    ).toBe("Hàng tuần vào Chủ Nhật");
    expect(
      formatRecurrenceRuleText("FREQ=WEEKLY;INTERVAL=1;BYDAY=SU", "en"),
    ).toBe("Weekly on Sunday");
    expect(
      formatRecurrenceRuleText("FREQ=WEEKLY;INTERVAL=2;BYDAY=SU", "vi"),
    ).toBe("Mỗi 2 tuần vào Chủ Nhật");

    // Weekly multiple days
    expect(
      formatRecurrenceRuleText("FREQ=WEEKLY;INTERVAL=1;BYDAY=TH,TU", "vi"),
    ).toBe("Hàng tuần vào các ngày Thứ Ba, Thứ Năm");

    // Monthly
    expect(
      formatRecurrenceRuleText("FREQ=MONTHLY;INTERVAL=1", "vi", sunday),
    ).toBe("Hàng tháng vào ngày 6");

    // With count
    expect(
      formatRecurrenceRuleText(
        "FREQ=WEEKLY;INTERVAL=1;BYDAY=SU;COUNT=5",
        "vi",
      ),
    ).toBe("Hàng tuần vào Chủ Nhật, 5 lần");

    // Null rule returns null
    expect(formatRecurrenceRuleText(null, "vi")).toBeNull();
    expect(formatRecurrenceRuleText("invalid-rule", "vi")).toBeNull();
  });
});


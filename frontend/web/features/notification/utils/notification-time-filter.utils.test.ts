import { describe, expect, it } from "vitest";
import {
  getNotificationDateRange,
  toLocalDateInputValue,
} from "./notification-time-filter.utils";

const fixedNow = new Date(2026, 8, 14, 15, 30, 45, 123);

describe("notification time filter ranges", () => {
  it("returns no range for all time", () => {
    expect(getNotificationDateRange("ALL_TIME", { now: fixedNow })).toEqual({});
  });

  it("returns local midnight through now for today", () => {
    expect(getNotificationDateRange("TODAY", { now: fixedNow })).toEqual({
      fromDate: new Date(2026, 8, 14, 0, 0, 0, 0).toISOString(),
      toDate: fixedNow.toISOString(),
    });
  });

  it("returns the last 7 days through now", () => {
    expect(getNotificationDateRange("LAST_7_DAYS", { now: fixedNow })).toEqual({
      fromDate: new Date(2026, 8, 7, 15, 30, 45, 123).toISOString(),
      toDate: fixedNow.toISOString(),
    });
  });

  it("returns the last 30 days through now", () => {
    expect(getNotificationDateRange("LAST_30_DAYS", { now: fixedNow })).toEqual({
      fromDate: new Date(2026, 7, 15, 15, 30, 45, 123).toISOString(),
      toDate: fixedNow.toISOString(),
    });
  });

  it("returns month start through now for this month", () => {
    expect(getNotificationDateRange("THIS_MONTH", { now: fixedNow })).toEqual({
      fromDate: new Date(2026, 8, 1, 0, 0, 0, 0).toISOString(),
      toDate: fixedNow.toISOString(),
    });
  });

  it("returns an inclusive custom date range", () => {
    expect(
      getNotificationDateRange("CUSTOM_RANGE", {
        customFromDate: "2026-09-03",
        customToDate: "2026-09-14",
        now: fixedNow,
      }),
    ).toEqual({
      fromDate: new Date(2026, 8, 3, 0, 0, 0, 0).toISOString(),
      toDate: new Date(2026, 8, 14, 23, 59, 59, 999).toISOString(),
    });
  });

  it("formats local dates for date inputs", () => {
    expect(toLocalDateInputValue(fixedNow)).toBe("2026-09-14");
  });
});

import { describe, expect, it } from "vitest";
import {
  createEndTimeOptions,
  createStartTimeOptions,
  formatDuration,
} from "./calendar-time-options";

describe("calendar time options", () => {
  it("creates all quarter-hour start times", () => {
    const options = createStartTimeOptions("en-US");

    expect(options).toHaveLength(96);
    expect(options.map((option) => option.value)).toContain("16:45");
    expect(options.map((option) => option.value)).toContain("17:00");
  });

  it("adds the duration to each suggested end time", () => {
    const options = createEndTimeOptions(
      "2026-08-30T17:00",
      "2026-08-30T18:00",
      "en-US",
    );

    expect(options.find((option) => option.value.endsWith("17:30"))?.label).toContain(
      "30 mins",
    );
    expect(options.find((option) => option.value.endsWith("18:00"))?.label).toContain(
      "1 hr",
    );
    expect(options.find((option) => option.value.endsWith("18:30"))?.label).toContain(
      "1.5 hrs",
    );
  });

  it("supports end times on the next day", () => {
    const options = createEndTimeOptions(
      "2026-08-30T23:30",
      "2026-08-31T00:30",
      "en-US",
    );

    expect(options.find((option) => option.value.endsWith("00:30"))?.value).toBe(
      "2026-08-31T00:30",
    );
  });

  it("formats Vietnamese durations", () => {
    expect(formatDuration(45, "vi-VN")).toBe("45 phút");
    expect(formatDuration(90, "vi-VN")).toBe("1,5 giờ");
  });
});

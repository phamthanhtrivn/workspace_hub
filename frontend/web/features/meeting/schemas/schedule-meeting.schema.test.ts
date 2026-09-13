import { describe, expect, it } from "vitest";
import { scheduleMeetingSchema } from "./schedule-meeting.schema";

const validSchedule = {
  title: "Planning sync",
  scheduledStartAt: "2099-08-31T09:00",
  scheduledEndAt: "2099-08-31T10:00",
  recurrenceRule: null,
  description: "",
  inviteeIds: [],
  password: "",
  requirePassword: false,
  hasExistingPassword: false,
  autoAdmit: false,
  chatEnabled: true,
  screenShareEnabled: true,
};

describe("schedule meeting schema", () => {
  it("accepts a valid future scheduled meeting", () => {
    expect(scheduleMeetingSchema.safeParse(validSchedule).success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = scheduleMeetingSchema.safeParse({
      ...validSchedule,
      title: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects meetings that end before the minimum duration", () => {
    const result = scheduleMeetingSchema.safeParse({
      ...validSchedule,
      scheduledEndAt: "2099-08-31T09:05",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "meeting.schedule.invalidRange",
      );
    }
  });

  it("requires a password when password protection is enabled for a new meeting", () => {
    const result = scheduleMeetingSchema.safeParse({
      ...validSchedule,
      requirePassword: true,
      password: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "meeting.schedule.passwordRequired",
      );
    }
  });

  it("keeps an existing password when editing without a new password", () => {
    const result = scheduleMeetingSchema.safeParse({
      ...validSchedule,
      requirePassword: true,
      hasExistingPassword: true,
      password: "   ",
    });

    expect(result.success).toBe(true);
  });

  it("requires a password when editing without an existing password", () => {
    const result = scheduleMeetingSchema.safeParse({
      ...validSchedule,
      requirePassword: true,
      hasExistingPassword: false,
      password: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "meeting.schedule.passwordRequired",
      );
    }
  });
});

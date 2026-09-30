import { beforeEach, expect, it, vi } from "vitest";
import { createCalendarPomodoroSession } from "@/features/calendar/api/calendar.api";
import { recordPomodoroSession } from "./pomodoro-server.api";

vi.mock("@/features/calendar/api/calendar.api", () => ({
  createCalendarPomodoroSession: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it("saves a custom Pomodoro task without sending its non-UUID id to Calendar", async () => {
  vi.mocked(createCalendarPomodoroSession).mockResolvedValue({
    id: "session-1",
    taskId: null,
    taskTitle: "Write report",
    projectId: null,
    projectName: null,
    notes: null,
    interruptionReason: null,
    startedAt: "2026-09-27T08:00:00.000Z",
    endedAt: "2026-09-27T08:25:00.000Z",
    sessionType: "FOCUS",
    status: "COMPLETED",
    plannedSeconds: 1500,
    actualSeconds: 1500,
    durationMinutes: 25,
    eventId: null,
  });

  const session = {
    notes: "x".repeat(2001),
    taskId: "custom-123",
    taskTitle: "Write report",
    sessionType: "FOCUS",
    status: "COMPLETED",
    startedAt: "2026-09-27T08:00:00.000Z",
    endedAt: "2026-09-27T08:25:00.000Z",
    durationMinutes: 25,
    actualSeconds: 1500,
  } as const;
  await recordPomodoroSession(session);
  await recordPomodoroSession(session);

  expect(createCalendarPomodoroSession).toHaveBeenCalledWith(
    expect.objectContaining({ taskId: undefined, taskTitle: "Write report", plannedSeconds: 1500, notes: "x".repeat(2000) }),
  );
  const calls = vi.mocked(createCalendarPomodoroSession).mock.calls;
  expect(calls[0][0].clientSessionId).toBe(calls[1][0].clientSessionId);
});

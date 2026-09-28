// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CalendarPomodoroPanel } from "./calendar-pomodoro-panel";
import {
  clearCalendarPomodoroTimerState,
  createCalendarPomodoroSession,
  getCalendarPomodoroConfig,
  getCalendarPomodoroSessions,
  getCalendarPomodoroTimerState,
  saveCalendarPomodoroTimerState,
} from "../../api/calendar.api";
import type { CalendarEvent } from "../../types/calendar.types";

vi.mock("../../api/calendar.api", () => ({
  clearCalendarPomodoroTimerState: vi.fn(),
  createCalendarPomodoroSession: vi.fn(),
  getCalendarPomodoroConfig: vi.fn(),
  getCalendarPomodoroSessions: vi.fn(),
  getCalendarPomodoroTimerState: vi.fn(),
  saveCalendarPomodoroTimerState: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const event = { id: "11111111-1111-1111-1111-111111111111", sourceType: "USER", sourceId: null } as CalendarEvent;

beforeEach(() => {
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue(null);
  vi.mocked(saveCalendarPomodoroTimerState).mockResolvedValue({ version: 1 } as Awaited<ReturnType<typeof saveCalendarPomodoroTimerState>>);
  vi.mocked(clearCalendarPomodoroTimerState).mockResolvedValue({ version: 2 } as Awaited<ReturnType<typeof clearCalendarPomodoroTimerState>>);
  vi.mocked(getCalendarPomodoroConfig).mockResolvedValue({ focusDuration: 25 } as Awaited<ReturnType<typeof getCalendarPomodoroConfig>>);
  vi.mocked(getCalendarPomodoroSessions).mockResolvedValue({
    sessions: [], summary: { focusSeconds: 0, completedFocusSessions: 0 },
    pagination: { page: 1, limit: 100, totalItems: 0, totalPages: 0 },
  });
  vi.mocked(createCalendarPomodoroSession).mockResolvedValue({ id: "saved" } as Awaited<ReturnType<typeof createCalendarPomodoroSession>>);
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("starts, saves, and clears a session through calendar-service", async () => {
  render(<CalendarPomodoroPanel event={event} userId="user-1" />);
  fireEvent.click(await screen.findByRole("button", { name: "Bắt đầu" }));
  await waitFor(() => expect(saveCalendarPomodoroTimerState).toHaveBeenCalledWith(
    expect.objectContaining({ eventId: event.id, status: "RUNNING", expectedVersion: 0 }),
  ));
  fireEvent.click(await screen.findByRole("button", { name: "Dừng và lưu" }));
  await waitFor(() => expect(createCalendarPomodoroSession).toHaveBeenCalledWith(
    expect.objectContaining({ eventId: event.id, status: "STOPPED", plannedSeconds: 1500 }),
  ));
  await waitFor(() => expect(clearCalendarPomodoroTimerState).toHaveBeenCalledWith(1));
});

it("shows and can discard a session started on another event", async () => {
  vi.mocked(getCalendarPomodoroTimerState).mockResolvedValue({
    eventId: "22222222-2222-2222-2222-222222222222",
    sessionStartAt: new Date().toISOString(),
    targetEndAt: new Date(Date.now() + 1500000).toISOString(),
    remainingSeconds: 1500, status: "RUNNING", version: 4,
  } as Awaited<ReturnType<typeof getCalendarPomodoroTimerState>>);
  render(<CalendarPomodoroPanel event={event} userId="user-1" />);
  fireEvent.click(await screen.findByRole("button", { name: "Bỏ phiên cũ" }));
  await waitFor(() => expect(clearCalendarPomodoroTimerState).toHaveBeenCalledWith(4));
});

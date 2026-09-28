// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PomodoroActiveTaskCard } from "./pomodoro-active-task";
import { getAllCalendarTasks, getCalendars } from "@/features/calendar/api/calendar.api";
import { EventSourceType, EventStatus, type CalendarEvent } from "@/features/calendar/types/calendar.types";

vi.mock("@/features/calendar/api/calendar.api", () => ({
  getAllCalendarTasks: vi.fn(),
  getCalendars: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("shows today's Calendar task on the main Pomodoro card and selects its linked IDs", async () => {
  vi.mocked(getCalendars).mockResolvedValue([]);
  const start = new Date();
  start.setHours(12, 30, 0, 0);
  vi.mocked(getAllCalendarTasks).mockResolvedValue([{
    id: "11111111-1111-1111-1111-111111111111",
    sourceId: "22222222-2222-2222-2222-222222222222",
    sourceType: EventSourceType.TASK,
    title: "haha",
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + 60 * 60_000).toISOString(),
    status: EventStatus.CONFIRMED,
    completedAt: null,
  } as CalendarEvent]);
  const onSetCustomTask = vi.fn();

  render(<PomodoroActiveTaskCard
    activeTask={null}
    notes=""
    onSelectTaskClick={vi.fn()}
    onClearTask={vi.fn()}
    onNotesChange={vi.fn()}
    onSetCustomTask={onSetCustomTask}
  />);

  fireEvent.click(await screen.findByRole("button", { name: /haha/ }));
  expect(onSetCustomTask).toHaveBeenCalledWith(expect.objectContaining({
    id: "22222222-2222-2222-2222-222222222222",
    calendarEventId: "11111111-1111-1111-1111-111111111111",
    title: "haha",
  }));
});

it("keeps other Calendar tasks visible when a task is already active", async () => {
  vi.mocked(getCalendars).mockResolvedValue([]);
  const start = new Date();
  start.setHours(14, 15, 0, 0);
  vi.mocked(getAllCalendarTasks).mockResolvedValue([{
    id: "33333333-3333-3333-3333-333333333333",
    sourceId: null,
    sourceType: EventSourceType.TASK,
    title: "đi chơi",
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + 60 * 60_000).toISOString(),
    status: EventStatus.CONFIRMED,
    completedAt: null,
  } as CalendarEvent]);
  const onSetCustomTask = vi.fn();

  render(<PomodoroActiveTaskCard
    activeTask={{ id: "11111111-1111-1111-1111-111111111111", title: "haha", calendarEventId: "11111111-1111-1111-1111-111111111111" }}
    notes=""
    onSelectTaskClick={vi.fn()}
    onClearTask={vi.fn()}
    onNotesChange={vi.fn()}
    onSetCustomTask={onSetCustomTask}
  />);

  fireEvent.click(await screen.findByRole("button", { name: /đi chơi/ }));
  expect(onSetCustomTask).toHaveBeenCalledWith(expect.objectContaining({
    id: "33333333-3333-3333-3333-333333333333",
    calendarEventId: "33333333-3333-3333-3333-333333333333",
    title: "đi chơi",
  }));
});

it("hides project calendar tasks just like the Calendar grid", async () => {
  const start = new Date();
  start.setHours(21, 30, 0, 0);
  vi.mocked(getCalendars).mockResolvedValue([{
    id: "project-calendar",
    projectId: "project-1",
  } as Awaited<ReturnType<typeof getCalendars>>[number]]);
  vi.mocked(getAllCalendarTasks).mockResolvedValue([
    {
      id: "project-task",
      calendarId: "project-calendar",
      title: "hehe",
      startAt: start.toISOString(),
      status: EventStatus.CONFIRMED,
      completedAt: null,
    } as CalendarEvent,
    {
      id: "personal-task",
      calendarId: "personal-calendar",
      title: "haha",
      startAt: start.toISOString(),
      status: EventStatus.CONFIRMED,
      completedAt: null,
    } as CalendarEvent,
  ]);

  render(<PomodoroActiveTaskCard
    activeTask={null}
    notes=""
    onSelectTaskClick={vi.fn()}
    onClearTask={vi.fn()}
    onNotesChange={vi.fn()}
    onSetCustomTask={vi.fn()}
  />);

  expect(await screen.findByRole("button", { name: /haha/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /hehe/ })).toBeNull();
});

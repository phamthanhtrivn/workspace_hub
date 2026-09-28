// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { PomodoroActiveTaskCard } from "./pomodoro-active-task";
import { getTodayCalendarTasks } from "../utils/today-calendar-tasks";
import { updateCalendarEvent } from "@/features/calendar/api/calendar.api";
import { EventSourceType, EventStatus, type CalendarEvent } from "@/features/calendar/types/calendar.types";

vi.mock("../utils/today-calendar-tasks", () => ({
  getTodayCalendarTasks: vi.fn(),
}));
vi.mock("@/features/calendar/api/calendar.api", () => ({
  updateCalendarEvent: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderWithQueryClient(element: ReactElement) {
  return render(<QueryClientProvider client={new QueryClient()}>{element}</QueryClientProvider>);
}

it("shows today's Calendar task on the main Pomodoro card and selects its linked IDs", async () => {
  const start = new Date();
  start.setHours(12, 30, 0, 0);
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([{
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

  renderWithQueryClient(<PomodoroActiveTaskCard
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
  const start = new Date();
  start.setHours(14, 15, 0, 0);
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([{
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

  renderWithQueryClient(<PomodoroActiveTaskCard
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

it("saves a Calendar task title before updating the Pomodoro card", async () => {
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([]);
  vi.mocked(updateCalendarEvent).mockResolvedValue({ id: "event-1", title: "Tên mới" } as CalendarEvent);
  const onUpdateActiveTask = vi.fn();

  renderWithQueryClient(<PomodoroActiveTaskCard
    activeTask={{ id: "event-1", calendarEventId: "event-1", title: "Tên cũ" }}
    notes=""
    onSelectTaskClick={vi.fn()}
    onClearTask={vi.fn()}
    onNotesChange={vi.fn()}
    onUpdateActiveTask={onUpdateActiveTask}
  />);

  fireEvent.click(screen.getByTitle("Đổi tên nhiệm vụ"));
  fireEvent.change(screen.getByDisplayValue("Tên cũ"), { target: { value: "Tên mới" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

  await waitFor(() => expect(updateCalendarEvent).toHaveBeenCalledWith("event-1", { title: "Tên mới" }));
  await waitFor(() => expect(onUpdateActiveTask).toHaveBeenCalledWith(expect.objectContaining({ title: "Tên mới" })));
});

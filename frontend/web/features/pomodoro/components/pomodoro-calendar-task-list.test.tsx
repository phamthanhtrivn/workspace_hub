// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  EventSourceType,
  EventStatus,
  type CalendarEvent,
} from "@/features/calendar/types/calendar.types";
import { PomodoroCalendarTaskList } from "./pomodoro-calendar-task-list";

afterEach(cleanup);

function task(id: string, title: string): CalendarEvent {
  return {
    id,
    title,
    startAt: "2026-09-28T09:00:00.000Z",
    endAt: "2026-09-28T09:25:00.000Z",
    sourceType: EventSourceType.TASK,
    status: EventStatus.CONFIRMED,
  } as CalendarEvent;
}

it("supports moving tasks with keyboard arrow keys", () => {
  const onReorder = vi.fn();

  render(
    <PomodoroCalendarTaskList
      tasks={[task("first", "Task A"), task("second", "Task B")]}
      isSaving={false}
      onSelect={vi.fn()}
      onReorder={onReorder}
    />,
  );

  fireEvent.keyDown(
    screen.getByRole("button", { name: "Kéo task Task B để đổi thứ tự" }),
    { key: "ArrowUp" },
  );

  expect(onReorder).toHaveBeenCalledWith("second", "first");
});

it("starts dragging from the task content instead of requiring the handle", async () => {
  const onReorder = vi.fn();

  render(
    <PomodoroCalendarTaskList
      tasks={[task("first", "Task A"), task("second", "Task B")]}
      isSaving={false}
      onSelect={vi.fn()}
      onReorder={onReorder}
    />,
  );

  const taskContent = screen.getByRole("button", { name: /^Task B/ });
  fireEvent.mouseDown(taskContent, { button: 0, clientX: 10, clientY: 40 });
  fireEvent.mouseMove(document, { clientX: 10, clientY: 20 });
  fireEvent.mouseUp(document, { clientX: 10, clientY: 10 });

  await waitFor(() => {
    expect(onReorder).toHaveBeenCalledWith("second", "first");
  });
  await new Promise((resolve) => setTimeout(resolve, 110));
});

it("displays task note preview and expands full note on toggle click", () => {
  const taskWithNote = {
    ...task("note-task", "đi chơi"),
    description: "Nhớ mang theo máy ảnh và sạc dự phòng",
  };

  render(
    <PomodoroCalendarTaskList
      tasks={[taskWithNote]}
      isSaving={false}
      onSelect={vi.fn()}
      onReorder={vi.fn()}
    />,
  );

  expect(
    screen.getByText("Nhớ mang theo máy ảnh và sạc dự phòng"),
  ).toBeTruthy();

  const toggleBtn = screen.getByRole("button", {
    name: "Xem đầy đủ ghi chú của đi chơi",
  });
  fireEvent.click(toggleBtn);

  expect(screen.getByText("Ghi chú công việc")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Thu gọn ghi chú của đi chơi" }),
  ).toBeTruthy();
});

it("strips internal [TASK] marker so empty task descriptions are not shown as notes", () => {
  const taskWithMarkerOnly = {
    ...task("marker-task", "huhu"),
    description: "[TASK]",
  };

  render(
    <PomodoroCalendarTaskList
      tasks={[taskWithMarkerOnly]}
      isSaving={false}
      onSelect={vi.fn()}
      onReorder={vi.fn()}
    />,
  );

  expect(screen.queryByText("[TASK]")).toBeNull();
  expect(
    screen.queryByRole("button", { name: /Xem đầy đủ ghi chú/ }),
  ).toBeNull();
});

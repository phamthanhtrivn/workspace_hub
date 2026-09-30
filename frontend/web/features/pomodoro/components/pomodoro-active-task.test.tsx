// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { PomodoroActiveTaskCard } from "./pomodoro-active-task";
import { getTodayCalendarTasks } from "../utils/today-calendar-tasks";
import { scheduleFocusTask } from "../utils/schedule-task";
import { getTodayProjectTasks } from "../utils/today-project-tasks";
import { normalizeTask, updateTask } from "@/features/project/api/task.api";
import { TaskPriority, TaskStatus, type Project } from "@/features/project/types/project";
import {
  cancelCalendarEvent,
  updateCalendarEvent,
  updateCalendarTaskOrder,
} from "@/features/calendar/api/calendar.api";
import {
  EventSourceType,
  EventStatus,
  type CalendarEvent,
} from "@/features/calendar/types/calendar.types";

vi.mock("../utils/today-calendar-tasks", () => ({
  getTodayCalendarTasks: vi.fn(),
}));
vi.mock("../utils/today-project-tasks", () => ({ getTodayProjectTasks: vi.fn() }));
vi.mock("@/store/store", () => ({ useAppSelector: () => "user-1" }));
vi.mock("@/features/project/api/task.api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/project/api/task.api")>(),
  updateTask: vi.fn(),
}));
beforeEach(() => vi.mocked(getTodayProjectTasks).mockResolvedValue([]));
vi.mock("../utils/schedule-task", () => ({
  defaultFocusStart: () => "2026-09-28T09:30",
  scheduleFocusTask: vi.fn(),
}));
vi.mock("@/features/calendar/api/calendar.api", () => ({
  cancelCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(),
  updateCalendarTaskOrder: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderWithQueryClient(element: ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {element}
    </QueryClientProvider>,
  );
}

it("limits session notes to the backend maximum", () => {
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([]);
  renderWithQueryClient(<PomodoroActiveTaskCard
    activeTask={{ id: "task-1", title: "Task" }} notes=""
    onNotesChange={vi.fn()}
  />);
  fireEvent.click(screen.getByRole("button", { name: "Ghi chú nhanh trong lúc tập trung" }));
  const notes = screen.getByPlaceholderText("Ghi lại nhanh ý tưởng, bug phát hiện, hoặc điều cần nhớ...");
  expect(notes.getAttribute("maxlength")).toBe("2000");
});

it("hides quick estimate and priority controls", () => {
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([]);

  renderWithQueryClient(
    <PomodoroActiveTaskCard
      activeTask={null}
      notes=""
      onClearTask={vi.fn()}
      onNotesChange={vi.fn()}
    />,
  );

  expect(screen.queryByText("Ước tính:")).toBeNull();
  expect(screen.queryByText("Thấp")).toBeNull();
  expect(screen.queryByText("Vừa")).toBeNull();
  expect(screen.queryByText("Cao")).toBeNull();
  expect(screen.queryByText("Gấp")).toBeNull();
  expect(screen.queryByRole("button", { name: "Chọn task" })).toBeNull();
  expect(
    screen.getByPlaceholderText("Ghi chú cho task (không bắt buộc)..."),
  ).toBeTruthy();
});

it("shows Project tasks alongside Calendar tasks and selects the real task ID without a Calendar event ID", async () => {
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([{
    id: "calendar-1", title: "Calendar task", sourceType: EventSourceType.TASK,
    startAt: new Date().toISOString(), endAt: new Date(Date.now() + 1_500_000).toISOString(),
  } as CalendarEvent]);
  const project = { id: "project-1", name: "Workspace", color: "#123456" } as Project;
  const task = normalizeTask({
    id: "task-1", projectId: project.id, title: "My project task", taskNumber: 1,
    description: "Task description", status: TaskStatus.TODO, priority: TaskPriority.HIGH,
    createdBy: "user-1", reporterId: "user-1", archived: false, allDay: false, estimatedMinutes: 50,
  });
  vi.mocked(getTodayProjectTasks).mockResolvedValue([{ task, project }]);
  const onSetCustomTask = vi.fn();
  renderWithQueryClient(<PomodoroActiveTaskCard activeTask={null} notes="" onNotesChange={vi.fn()} onSetCustomTask={onSetCustomTask} />);

  expect(await screen.findByText("Calendar task")).toBeTruthy();
  fireEvent.click(await screen.findByRole("button", { name: "My project task Workspace" }));
  expect(getTodayProjectTasks).toHaveBeenCalledWith("user-1");
  expect(onSetCustomTask).toHaveBeenCalledWith(expect.objectContaining({
    id: task.id, projectId: project.id, projectName: project.name, estimatedPomodoros: 2,
  }));
  expect(onSetCustomTask.mock.calls[0][0].calendarEventId).toBeUndefined();
});

it("keeps Calendar tasks available when Project is unavailable and supports retry", async () => {
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([{
    id: "calendar-1", title: "Available Calendar task", sourceType: EventSourceType.TASK,
    startAt: new Date().toISOString(), endAt: new Date(Date.now() + 1_500_000).toISOString(),
  } as CalendarEvent]);
  vi.mocked(getTodayProjectTasks).mockRejectedValueOnce(new Error("Offline"));
  renderWithQueryClient(<PomodoroActiveTaskCard activeTask={null} notes="" onNotesChange={vi.fn()} />);
  expect(await screen.findByText("Không tải được task Project.")).toBeTruthy();
  expect(screen.getByText("Available Calendar task")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  expect(await screen.findByText("Không có task Project được giao cho bạn trong hôm nay.")).toBeTruthy();
});

it("edits an active Project task through Project service rather than Calendar", async () => {
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([]);
  const onUpdateActiveTask = vi.fn();
  renderWithQueryClient(<PomodoroActiveTaskCard
    activeTask={{ id: "project-task-1", projectId: "project-1", title: "Project title", description: "Project note" }}
    notes="" onNotesChange={vi.fn()} onUpdateActiveTask={onUpdateActiveTask}
  />);
  fireEvent.click(screen.getByTitle("Đổi tên nhiệm vụ"));
  fireEvent.change(screen.getByDisplayValue("Project title"), { target: { value: "Updated project title" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(updateTask).toHaveBeenCalledWith("project-task-1", { title: "Updated project title" }));
  await waitFor(() => expect(onUpdateActiveTask).toHaveBeenCalled());
  expect(updateCalendarEvent).not.toHaveBeenCalled();
});

it("saves a quick task note in the Calendar event description", async () => {
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([]);
  vi.mocked(scheduleFocusTask).mockResolvedValue("calendar-event-1");
  const onSetCustomTask = vi.fn();

  renderWithQueryClient(
    <PomodoroActiveTaskCard
      activeTask={null}
      notes=""
      onClearTask={vi.fn()}
      onNotesChange={vi.fn()}
      onSetCustomTask={onSetCustomTask}
    />,
  );

  fireEvent.change(
    screen.getByPlaceholderText(
      "Bạn muốn tập trung làm gì trong phiên này?...",
    ),
    {
      target: { value: "Viết báo cáo" },
    },
  );
  fireEvent.change(
    screen.getByPlaceholderText("Ghi chú cho task (không bắt buộc)..."),
    {
      target: { value: "Hoàn thành phần kết luận" },
    },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Đặt mục tiêu & thêm vào Calendar" }),
  );

  await waitFor(() =>
    expect(scheduleFocusTask).toHaveBeenCalledWith({
      title: "Viết báo cáo",
      startsAt: "2026-09-28T09:30",
      pomodoros: 2,
      focusDurationMinutes: 25,
      description: "Hoàn thành phần kết luận",
    }),
  );
  await waitFor(() => expect(onSetCustomTask).toHaveBeenCalled());
});

it("creates another Calendar task without replacing the active Pomodoro task", async () => {
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([]);
  vi.mocked(scheduleFocusTask).mockResolvedValue("calendar-event-2");
  const onSetCustomTask = vi.fn();

  renderWithQueryClient(
    <PomodoroActiveTaskCard
      activeTask={{
        id: "active-task-1",
        calendarEventId: "active-event-1",
        title: "Task đang chạy",
      }}
      focusDurationMinutes={40}
      notes=""
      onClearTask={vi.fn()}
      onNotesChange={vi.fn()}
      onSetCustomTask={onSetCustomTask}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Tạo task mới" }));
  fireEvent.change(screen.getByLabelText("Task mới"), {
    target: { value: "Task làm sau" },
  });
  fireEvent.change(screen.getByLabelText(/Ghi chú/), {
    target: { value: "Không đổi task đang chạy" },
  });
  expect(screen.getByText("80 phút dự kiến")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tăng số Pomodoro" }));
  expect(screen.getByText("3 Pomodoro")).toBeTruthy();
  expect(screen.getByText("120 phút dự kiến")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Thêm vào Calendar" }));

  await waitFor(() =>
    expect(scheduleFocusTask).toHaveBeenCalledWith({
      title: "Task làm sau",
      startsAt: "2026-09-28T09:30",
      pomodoros: 3,
      focusDurationMinutes: 40,
      description: "Không đổi task đang chạy",
    }),
  );
  await waitFor(() => expect(getTodayCalendarTasks).toHaveBeenCalledTimes(2));
  expect(onSetCustomTask).not.toHaveBeenCalled();
  expect(screen.getByText("Task đang chạy")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Đổi task" })).toBeNull();
  expect(screen.queryByLabelText("Task mới")).toBeNull();
});

it("shows today's Calendar task on the main Pomodoro card and selects its linked IDs", async () => {
  const start = new Date();
  start.setHours(12, 30, 0, 0);
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([
    {
      id: "11111111-1111-1111-1111-111111111111",
      sourceId: "22222222-2222-2222-2222-222222222222",
      sourceType: EventSourceType.TASK,
      title: "haha",
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 60 * 60_000).toISOString(),
      status: EventStatus.CONFIRMED,
      completedAt: null,
    } as CalendarEvent,
  ]);
  const onSetCustomTask = vi.fn();

  renderWithQueryClient(
    <PomodoroActiveTaskCard
      activeTask={null}
      notes=""
      onClearTask={vi.fn()}
      onNotesChange={vi.fn()}
      onSetCustomTask={onSetCustomTask}
    />,
  );

  fireEvent.click((await screen.findByText("haha")).closest("button")!);
  expect(onSetCustomTask).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "22222222-2222-2222-2222-222222222222",
      calendarEventId: "11111111-1111-1111-1111-111111111111",
      title: "haha",
    }),
  );
});

it("keeps other Calendar tasks visible when a task is already active", async () => {
  const start = new Date();
  start.setHours(14, 15, 0, 0);
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([
    {
      id: "33333333-3333-3333-3333-333333333333",
      sourceId: null,
      sourceType: EventSourceType.TASK,
      title: "đi chơi",
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 60 * 60_000).toISOString(),
      status: EventStatus.CONFIRMED,
      completedAt: null,
    } as CalendarEvent,
  ]);
  const onSetCustomTask = vi.fn();

  renderWithQueryClient(
    <PomodoroActiveTaskCard
      activeTask={{
        id: "11111111-1111-1111-1111-111111111111",
        title: "haha",
        calendarEventId: "11111111-1111-1111-1111-111111111111",
      }}
      notes=""
      onClearTask={vi.fn()}
      onNotesChange={vi.fn()}
      onSetCustomTask={onSetCustomTask}
    />,
  );

  fireEvent.click((await screen.findByText("đi chơi")).closest("button")!);
  expect(onSetCustomTask).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "33333333-3333-3333-3333-333333333333",
      calendarEventId: "33333333-3333-3333-3333-333333333333",
      title: "đi chơi",
    }),
  );
});

it("persists a keyboard task reorder without changing task times", async () => {
  const firstStart = new Date();
  firstStart.setHours(13, 30, 0, 0);
  const secondStart = new Date();
  secondStart.setHours(20, 10, 0, 0);
  const event = (id: string, title: string, startAt: Date) =>
    ({
      id,
      sourceId: null,
      sourceType: EventSourceType.TASK,
      title,
      startAt: startAt.toISOString(),
      endAt: new Date(startAt.getTime() + 25 * 60_000).toISOString(),
      status: EventStatus.CONFIRMED,
      completedAt: null,
      taskOrder: null,
    }) as CalendarEvent;
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([
    event("event-1", "Task đầu", firstStart),
    event("event-2", "Task sau", secondStart),
  ]);
  vi.mocked(updateCalendarTaskOrder).mockResolvedValue(["event-2", "event-1"]);

  renderWithQueryClient(
    <PomodoroActiveTaskCard
      activeTask={null}
      notes=""
      onClearTask={vi.fn()}
      onNotesChange={vi.fn()}
      onSetCustomTask={vi.fn()}
    />,
  );

  fireEvent.keyDown(
    await screen.findByRole("button", {
      name: "Kéo task Task sau để đổi thứ tự",
    }),
    { key: "ArrowUp" },
  );

  await waitFor(() =>
    expect(updateCalendarTaskOrder).toHaveBeenCalledWith([
      "event-2",
      "event-1",
    ]),
  );
  expect(screen.getByText("13:30")).toBeTruthy();
  expect(screen.getByText("20:10")).toBeTruthy();
});

it("saves a Calendar task title before updating the Pomodoro card", async () => {
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([]);
  vi.mocked(updateCalendarEvent).mockResolvedValue({
    id: "event-1",
    title: "Tên mới",
  } as CalendarEvent);
  const onUpdateActiveTask = vi.fn();

  renderWithQueryClient(
    <PomodoroActiveTaskCard
      activeTask={{
        id: "event-1",
        calendarEventId: "event-1",
        title: "Tên cũ",
      }}
      notes=""
      onClearTask={vi.fn()}
      onNotesChange={vi.fn()}
      onUpdateActiveTask={onUpdateActiveTask}
    />,
  );

  fireEvent.click(screen.getByTitle("Đổi tên nhiệm vụ"));
  fireEvent.change(screen.getByDisplayValue("Tên cũ"), {
    target: { value: "Tên mới" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

  await waitFor(() =>
    expect(updateCalendarEvent).toHaveBeenCalledWith("event-1", {
      title: "Tên mới",
    }),
  );
  await waitFor(() =>
    expect(onUpdateActiveTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Tên mới" }),
    ),
  );
});

it("displays and inline-edits the active task note synced with Calendar", async () => {
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([]);
  vi.mocked(updateCalendarEvent).mockResolvedValue({
    id: "event-1",
    title: "Viết báo cáo",
    description: "Ghi chú đã cập nhật",
  } as CalendarEvent);
  const onUpdateActiveTask = vi.fn();

  renderWithQueryClient(
    <PomodoroActiveTaskCard
      activeTask={{
        id: "event-1",
        calendarEventId: "event-1",
        title: "Viết báo cáo",
        description: "Ghi chú ban đầu",
      }}
      notes=""
      onClearTask={vi.fn()}
      onNotesChange={vi.fn()}
      onUpdateActiveTask={onUpdateActiveTask}
    />,
  );

  expect(screen.getByText("Ghi chú ban đầu")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Sửa ghi chú nhiệm vụ" }));
  fireEvent.change(screen.getByLabelText("Ghi chú của task"), {
    target: { value: "Ghi chú đã cập nhật" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu ghi chú" }));

  await waitFor(() =>
    expect(updateCalendarEvent).toHaveBeenCalledWith("event-1", {
      description: "Ghi chú đã cập nhật",
    }),
  );
  await waitFor(() =>
    expect(onUpdateActiveTask).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Ghi chú đã cập nhật" }),
    ),
  );
});

it("deletes a confirmed Calendar task and clears it when active", async () => {
  const event = {
    id: "event-to-delete",
    sourceId: null,
    sourceType: EventSourceType.TASK,
    title: "Task cần xóa",
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 25 * 60_000).toISOString(),
    status: EventStatus.CONFIRMED,
    completedAt: null,
  } as CalendarEvent;
  vi.mocked(getTodayCalendarTasks).mockResolvedValue([event]);
  vi.mocked(cancelCalendarEvent).mockResolvedValue(undefined);
  const onClearTask = vi.fn();

  renderWithQueryClient(
    <PomodoroActiveTaskCard
      activeTask={{
        id: event.id,
        calendarEventId: event.id,
        title: event.title,
      }}
      notes=""
      onClearTask={onClearTask}
      onNotesChange={vi.fn()}
    />,
  );

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Thao tác cho task Task cần xóa",
    }),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Xóa task" }));
  fireEvent.click(screen.getByRole("button", { name: "Xóa task" }));

  expect(cancelCalendarEvent).toHaveBeenCalledWith("event-to-delete");
  await Promise.resolve();
  await Promise.resolve();
  expect(onClearTask).toHaveBeenCalledTimes(1);
});

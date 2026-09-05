import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { taskDateKey, toApiDateTime, toDateTimeInput } from "./utils/task-dates";
import { useProjectTaskActions } from "./hooks/use-project-task-actions";
import { useUpdateTask } from "./hooks/use-tasks";
import { createProjectGroupActions } from "./project-group-actions";
import { getProjectPermissions } from "./project-permissions";
import { TaskStatus, type Task, type Project, type Sprint } from "./types/project";
import * as taskApi from "./api/task.api";
import * as commentApi from "./api/comment.api";
import TaskChatDialog from "./components/task-chat-dialog";
import SprintMetricsView from "./components/sprint-metrics-view";

vi.mock("@/lib/axios", () => ({ api: {} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("./project-alert", () => ({ confirmProjectAction: vi.fn(async () => true) }));
vi.mock("@/store/store", () => ({ useAppSelector: () => ({ userId: "user" }) }));
vi.mock("./components/avatar-stack", () => ({ Avatar: () => null }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

function task(id: string): Task {
  return { id, projectId: "p", title: id, status: TaskStatus.TODO, createdBy: "user", comments: [], checklists: [], assignees: [], labels: [] } as unknown as Task;
}

describe("Project production regressions", () => {
  it("round-trips local task times and keeps all-day dates unchanged", () => {
    expect(toDateTimeInput("2026-09-05T02:00:00.000Z")).toBe("2026-09-05T09:00");
    expect(toApiDateTime("2026-09-05T09:00", false)).toBe("2026-09-05T02:00:00.000Z");
    expect(taskDateKey("2026-09-05T23:00:00Z")).toBe("2026-09-06");
    expect(taskDateKey("2026-09-05T23:00:00Z", true)).toBe("2026-09-05");
    expect(toApiDateTime("2026-09-05", true)).toBe("2026-09-05T00:00:00.000Z");
    expect(JSON.parse(JSON.stringify({ startDate: toApiDateTime("", false), dueDate: toApiDateTime("", false) }))).toEqual({ startDate: null, dueDate: null });
  });

  it("propagates failed task updates to the caller without updating local task state", async () => {
    const { wrapper } = setup();
    const setSelectedTask = vi.fn();
    const updateTask = vi.fn().mockRejectedValue(new Error("HTTP 500"));
    const { result } = renderHook(() => useProjectTaskActions({
      projectId: "p", tasks: [task("A")], members: [],
      permissions: getProjectPermissions({ ownerId: "user" } as Project, [], "user"), editingTask: null,
      setSelectedTask, setStatusOverrides: vi.fn(), rejectChange: () => false, closeTaskForm: vi.fn(),
      createTask: vi.fn(), updateTask, addTasksToSprint: vi.fn(),
    }), { wrapper });
    await expect(result.current.updateTaskDirect("A", { title: "Changed" })).rejects.toThrow("HTTP 500");
    expect(setSelectedTask).not.toHaveBeenCalled();
  });

  it("invalidates both task and sprint caches when a task changes", async () => {
    const { client, wrapper } = setup();
    vi.spyOn(taskApi, "updateTask").mockResolvedValue(task("A"));
    client.setQueryData(["projects", "p", "tasks"], [task("A")]);
    client.setQueryData(["projects", "p", "sprints"], []);
    const { result } = renderHook(() => useUpdateTask("p"), { wrapper });
    await act(() => result.current.mutateAsync({ taskId: "A", payload: { title: "Changed" } }));
    expect(client.getQueryState(["projects", "p", "tasks"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["projects", "p", "sprints"])?.isInvalidated).toBe(true);
  });

  it("creates a sprint task with one request and uses sortable ranks", async () => {
    const createTask = vi.fn().mockResolvedValue(task("A"));
    const addTasksToSprint = vi.fn();
    const updateTask = vi.fn();
    const actions = createProjectGroupActions({ tasks: [], editingGroup: null, setEditingGroup: vi.fn(), setSelectedTask: vi.fn(), rejectChange: () => false, createTask, updateTask, addTasksToSprint });
    await actions.createSprintTask("sprint", "Title");
    expect(createTask).toHaveBeenCalledWith({ title: "Title", status: TaskStatus.TODO, sprintId: "sprint" });
    expect(addTasksToSprint).not.toHaveBeenCalled();
    await actions.reorderTasks(task("group"), Array.from({ length: 12 }, (_, i) => task(String(i))));
    const ranks = updateTask.mock.calls.map(([input]) => input.payload.rank);
    expect([...ranks].sort()).toEqual(ranks);
  });

  it("loads separate persisted discussion histories when switching tasks", async () => {
    const { wrapper } = setup();
    const stored: Record<string, commentApi.CreateTaskCommentPayload[]> = { A: [], B: [] };
    const asComments = (id: string) => stored[id].map((item, i) => ({ ...item, id: `${id}-${i}`, taskId: id, authorId: "user", authorName: "Me", edited: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    vi.spyOn(commentApi, "getTaskComments").mockImplementation(async (id) => asComments(id));
    const send = vi.spyOn(commentApi, "createTaskComment").mockImplementation(async (id, payload) => { stored[id].push(payload); return asComments(id).at(-1)!; });
    const view = render(<TaskChatDialog task={task("A")} members={[]} canComment onClose={vi.fn()} />, { wrapper });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Message for A" } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    await screen.findByText("Message for A");
    expect(send).toHaveBeenCalledWith("A", { content: "Message for A" });
    view.rerender(<TaskChatDialog task={task("B")} members={[]} canComment onClose={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText("Message for A")).toBeNull());
    view.unmount();
    const next = setup();
    render(<TaskChatDialog task={task("A")} members={[]} canComment onClose={vi.fn()} />, { wrapper: next.wrapper });
    await screen.findByText("Message for A");
  });

  it("shows measured current progress without fabricated history or counting cancelled as done", () => {
    const tasks = [{ ...task("A"), sprintId: "s", status: TaskStatus.DONE }, { ...task("B"), sprintId: "s", status: TaskStatus.CANCELLED }];
    const view = render(<SprintMetricsView sprints={[{ id: "s", name: "Sprint" } as Sprint]} tasks={tasks} />);
    expect(screen.getByRole("progressbar").getAttribute("value")).toBe("1");
    expect(screen.getByRole("progressbar").getAttribute("max")).toBe("2");
    expect(view.container.querySelector("svg")).toBeNull();
  });
});

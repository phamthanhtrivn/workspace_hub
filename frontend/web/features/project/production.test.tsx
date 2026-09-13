import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  taskDateKey,
  toApiDateTime,
  toDateTimeInput,
} from "./utils/task-dates";
import { useProjectTaskActions } from "./hooks/use-project-task-actions";
import { useProjectResourceActions } from "./hooks/use-project-resource-actions";
import { useUpdateTask } from "./hooks/use-tasks";
import {
  useAttachLabel,
  useDetachLabel,
  useUpdateLabel,
  useDeleteLabel,
} from "./hooks/use-labels";
import * as labelApi from "./api/label.api";
import { createProjectGroupActions } from "./project-group-actions";
import { getProjectPermissions } from "./project-permissions";
import {
  ProjectRole,
  ProjectType,
  SprintStatus,
  TaskPriority,
  TaskStatus,
  type Task,
  type Project,
  type ProjectMember,
  type Sprint,
} from "./types/project";
import * as taskApi from "./api/task.api";
import * as commentApi from "./api/comment.api";
import CreateProjectDialog from "./components/dialogs/create-project-dialog";
import TaskChatDialog from "./components/dialogs/task-chat-dialog";
import SprintMetricsView from "./components/views/sprint-metrics-view";
import { SprintCard } from "./components/backlog/sprint-card";
import { TaskDurationSelect } from "./components/forms/task-duration-select";
import ProjectDetailSidebar from "./components/layout/project-detail-sidebar";
import { buildWeekTaskSegments } from "./components/views/calendar-view";
import TaskPropertiesPanel from "./components/task-detail/task-properties-panel";
import BoardView from "./components/views/board-view";
import { formatTaskRelativeTime } from "./utils/task-relative-time";

vi.mock("@/lib/axios", () => ({ api: {} }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock("./project-alert", () => ({
  confirmProjectAction: vi.fn(async () => true),
}));
vi.mock("@/store/store", () => ({
  useAppSelector: () => ({
    userId: "user",
    fullName: "Test User",
    avatarUrl: "https://cdn.example.com/avatar.png",
  }),
}));
vi.mock("./components/ui/avatar-stack", () => ({
  Avatar: ({ user }: { user: { displayName: string; avatarUrl?: string } }) => (
    <span
      aria-label={user.displayName}
      data-avatar-url={user.avatarUrl || ""}
    />
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TaskDurationSelect", () => {
  it("offers quick duration presets and custom minutes", () => {
    const onValueChange = vi.fn();
    const view = render(
      <TaskDurationSelect value="" onValueChange={onValueChange} />,
    );

    const select = screen.getByRole("combobox");
    expect(screen.getByRole("option", { name: "30 min" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "60 min (1h)" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "360 min (6h)" })).toBeTruthy();

    fireEvent.change(select, { target: { value: "120" } });
    expect(onValueChange).toHaveBeenLastCalledWith("120");

    view.rerender(
      <TaskDurationSelect value="120" onValueChange={onValueChange} />,
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "custom" },
    });
    expect(screen.getByRole("spinbutton")).toBeTruthy();
  });
});

describe("ProjectDetailSidebar members", () => {
  it("shows five members inline and opens the members view", () => {
    const onViewChange = vi.fn();
    const members = Array.from({ length: 6 }, (_, index) => ({
      id: `member-${index}`,
      projectId: "p",
      userId: `user-${index}`,
      displayName: `Member ${index + 1}`,
      role: index === 0 ? ProjectRole.OWNER : ProjectRole.MEMBER,
    })) as ProjectMember[];

    render(
      <ProjectDetailSidebar
        project={
          {
            id: "p",
            name: "Project",
            projectType: ProjectType.GENERAL,
          } as Project
        }
        members={members}
        projectKey="PRJ"
        viewMode="summary"
        isCollapsed={false}
        canOpenSettings={false}
        onViewChange={onViewChange}
        onToggle={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );

    expect(screen.getByText("Member 1")).toBeTruthy();
    expect(screen.queryByText("Member 6")).toBeNull();
    fireEvent.click(screen.getByText("+1 more"));
    expect(onViewChange).toHaveBeenCalledWith("members");
    fireEvent.click(screen.getByText("View all"));
    expect(onViewChange).toHaveBeenCalledWith("members");
  });
});

describe("Calendar task ranges", () => {
  it("renders a multi-day task as one segment spanning consecutive columns", () => {
    const rangedTask = {
      ...task("range"),
      startDate: "2026-09-25T00:00:00.000Z",
      dueDate: "2026-09-27T00:00:00.000Z",
      allDay: true,
    };
    const days = [
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ].map((key) => ({
      key,
      tasks: key >= "2026-09-25" ? [rangedTask] : [],
    }));

    expect(buildWeekTaskSegments(days)).toEqual([
      expect.objectContaining({
        task: rangedTask,
        startColumn: 4,
        span: 3,
        lane: 0,
        showTitle: true,
      }),
    ]);
  });
});

describe("Task assignee details", () => {
  it("resolves the assignee name and avatar from project members", () => {
    const assignedTask = {
      ...task("assigned"),
      priority: TaskPriority.MEDIUM,
      estimatedMinutes: 0,
      reporterId: "reporter",
      allDay: false,
      createdAt: "2026-09-13T00:00:00.000Z",
      updatedAt: "2026-09-13T00:00:00.000Z",
      assignees: [
        {
          id: "assignment",
          taskId: "assigned",
          userId: "member-user",
          displayName: "",
          assignedAt: "2026-09-13T00:00:00.000Z",
        },
      ],
    };
    const assignedMember = {
      id: "member",
      projectId: "p",
      userId: "member-user",
      displayName: "Assigned Person",
      avatarUrl: "https://cdn.example.com/assigned.png",
      role: ProjectRole.MEMBER,
    } as ProjectMember;

    render(
      <TaskPropertiesPanel
        task={assignedTask}
        members={[assignedMember]}
        isReadOnly
        memberDisplayName={() => "Fallback"}
        onAssigneeChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onStartDateChange={vi.fn()}
        onDueDateChange={vi.fn()}
        onEstimateSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Assigned Person")).toBeTruthy();
    expect(
      screen.getByLabelText("Assigned Person").getAttribute("data-avatar-url"),
    ).toBe("https://cdn.example.com/assigned.png");
  });
});

describe("Project relative time", () => {
  const now = new Date("2026-09-13T12:00:00.000Z").getTime();
  const formatRelativeTime = (value: number, unit: string) =>
    `${value}:${unit}`;
  const formatDate = (value: Date) => value.toISOString().slice(0, 10);

  it.each([
    ["2026-09-13T11:30:00.000Z", "-30:minute"],
    ["2026-09-13T10:00:00.000Z", "-2:hour"],
    ["2026-08-24T12:00:00.000Z", "-20:day"],
    ["2026-07-01T12:00:00.000Z", "2026-07-01"],
  ])("formats %s with a readable unit", (value, expected) => {
    expect(
      formatTaskRelativeTime({
        value,
        now,
        formatRelativeTime,
        formatDate,
      }),
    ).toBe(expected);
  });
});

describe("Board task creation", () => {
  it("only offers task creation in the TODO column", () => {
    const onAddTask = vi.fn();
    render(<BoardView tasks={[]} onAddTask={onAddTask} />);

    expect(screen.getAllByText("Add task")).toHaveLength(1);
    fireEvent.click(screen.getByText("Add task"));
    expect(onAddTask).toHaveBeenCalledWith(TaskStatus.TODO);
  });
});

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

function task(id: string): Task {
  return {
    id,
    projectId: "p",
    title: id,
    status: TaskStatus.TODO,
    createdBy: "user",
    comments: [],
    checklists: [],
    assignees: [],
    labels: [],
  } as unknown as Task;
}

describe("Project production regressions", () => {
  it("lets an assignee move a task without granting full task editing", () => {
    const memberId = "assigned-member";
    const permissions = getProjectPermissions(
      { ownerId: "owner" } as Project,
      [
        {
          userId: memberId,
          role: ProjectRole.MEMBER,
          canEditOwnTask: false,
          canEditOthersTask: false,
        } as ProjectMember,
      ],
      memberId,
    );
    const assignedTask = {
      ...task("assigned"),
      createdBy: "another-member",
      assignees: [{ userId: memberId } as Task["assignees"][number]],
    };

    expect(permissions.canEditTask(assignedTask)).toBe(false);
    expect(permissions.canContributeTask(assignedTask)).toBe(true);
    expect(
      permissions.canContributeTask({ ...assignedTask, assignees: [] }),
    ).toBe(false);
  });

  it("lets an assignee use checklist actions without full task editing", async () => {
    const selectedTask = {
      ...task("assigned"),
      createdBy: "another-member",
      assignees: [{ userId: "user" } as Task["assignees"][number]],
      checklists: [
        {
          id: "check-1",
          taskId: "assigned",
          title: "Verify",
          completed: false,
          createdAt: "2026-09-12T00:00:00.000Z",
          rank: "1000",
        },
      ],
    };
    const created = {
      id: "check-2",
      taskId: "assigned",
      title: "Review",
      completed: false,
      createdAt: "2026-09-12T00:00:00.000Z",
      rank: "2000",
    };
    const createChecklist = vi
      .spyOn(taskApi, "createChecklist")
      .mockResolvedValue(created);
    const updateChecklist = vi
      .spyOn(taskApi, "updateChecklist")
      .mockResolvedValue({
        ...selectedTask.checklists[0],
        completed: true,
      });
    const deleteChecklist = vi
      .spyOn(taskApi, "deleteChecklist")
      .mockResolvedValue(undefined);
    const { wrapper } = setup();
    const { result } = renderHook(
      () =>
        useProjectResourceActions({
          projectId: "p",
          labels: [],
          selectedTask,
          setSelectedTask: vi.fn(),
          rejectChange: () => true,
          rejectChecklistChange: () => false,
        }),
      { wrapper },
    );

    await act(() => result.current.createChecklist("assigned", "Review"));
    await act(() => result.current.updateChecklist("check-1", true));
    await act(() => result.current.deleteChecklist("check-1"));

    expect(createChecklist).toHaveBeenCalledWith("assigned", "Review");
    expect(updateChecklist).toHaveBeenCalledWith("check-1", true);
    expect(deleteChecklist).toHaveBeenCalledWith("check-1");

    const blocked = renderHook(
      () =>
        useProjectResourceActions({
          projectId: "p",
          labels: [],
          selectedTask,
          setSelectedTask: vi.fn(),
          rejectChange: () => false,
          rejectChecklistChange: () => true,
        }),
      { wrapper },
    );
    await act(async () => {
      await expect(
        blocked.result.current.createChecklist("assigned", "Blocked"),
      ).rejects.toThrow("This task is completed and read-only.");
    });
    expect(createChecklist).toHaveBeenCalledTimes(1);
  });

  it("shows sprint quick-create without sprint-management permission", () => {
    const sprint = {
      id: "sprint-1",
      projectId: "p",
      name: "Sprint 1",
      status: SprintStatus.PLANNED,
      createdBy: "owner",
      createdAt: "2026-09-12T00:00:00.000Z",
      updatedAt: "2026-09-12T00:00:00.000Z",
      tasks: [task("A")],
    } satisfies Sprint;
    const props = {
      sprint,
      dragOverTarget: null,
      onDragOver: vi.fn(),
      onDragLeave: vi.fn(),
      onDrop: vi.fn(),
      onDragStart: vi.fn(),
      canContribute: true,
      canCreateTask: true,
      filesBusy: false,
      isBusy: false,
      onEditSprint: vi.fn(),
      onStartSprint: vi.fn(),
      onCompleteSprint: vi.fn(),
      onReopenSprint: vi.fn(),
      onCreateSprintTask: vi.fn(),
    };
    const view = render(<SprintCard {...props} canManageSprints={false} />);

    expect(
      screen.getByRole("button", { name: "Create task in sprint" }),
    ).toBeTruthy();
    expect(view.container.querySelector('[draggable="true"]')).toBeNull();

    view.rerender(<SprintCard {...props} canManageSprints />);
    expect(view.container.querySelector('[draggable="true"]')).not.toBeNull();
  });

  it("exposes an accessible create-project form for a regular project", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<CreateProjectDialog open onClose={vi.fn()} onSubmit={onSubmit} />);

    const dialog = screen.getByRole("dialog", {
      name: "Create new project",
    });
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Delivery platform" },
    });
    fireEvent.submit(dialog);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Delivery platform",
        }),
      ),
    );
  });

  it("round-trips local task times and keeps all-day dates unchanged", () => {
    expect(toDateTimeInput("2026-09-05T02:00:00.000Z")).toBe(
      "2026-09-05T09:00",
    );
    expect(toApiDateTime("2026-09-05T09:00", false)).toBe(
      "2026-09-05T02:00:00.000Z",
    );
    expect(taskDateKey("2026-09-05T23:00:00Z")).toBe("2026-09-06");
    expect(taskDateKey("2026-09-05T23:00:00Z", true)).toBe("2026-09-05");
    expect(toApiDateTime("2026-09-05", true)).toBe("2026-09-05T00:00:00.000Z");
    expect(
      JSON.parse(
        JSON.stringify({
          startDate: toApiDateTime("", false),
          dueDate: toApiDateTime("", false),
        }),
      ),
    ).toEqual({ startDate: null, dueDate: null });
  });

  it("propagates failed task updates to the caller without updating local task state", async () => {
    const { wrapper } = setup();
    const setSelectedTask = vi.fn();
    const updateTask = vi.fn().mockRejectedValue(new Error("HTTP 500"));
    const { result } = renderHook(
      () =>
        useProjectTaskActions({
          projectId: "p",
          tasks: [task("A")],
          members: [],
          permissions: getProjectPermissions(
            { ownerId: "user" } as Project,
            [],
            "user",
          ),
          editingTask: null,
          setSelectedTask,
          setStatusOverrides: vi.fn(),
          rejectChange: () => false,
          closeTaskForm: vi.fn(),
          createTask: vi.fn(),
          updateTask,
          addTasksToSprint: vi.fn(),
        }),
      { wrapper },
    );
    await expect(
      result.current.updateTaskDirect("A", { title: "Changed" }),
    ).rejects.toThrow("HTTP 500");
    expect(setSelectedTask).not.toHaveBeenCalled();
  });

  it("invalidates both task and sprint caches when a task changes", async () => {
    const { client, wrapper } = setup();
    vi.spyOn(taskApi, "updateTask").mockResolvedValue(task("A"));
    client.setQueryData(["projects", "p", "tasks"], [task("A")]);
    client.setQueryData(["projects", "p", "sprints"], []);
    const { result } = renderHook(() => useUpdateTask("p"), { wrapper });
    await act(() =>
      result.current.mutateAsync({
        taskId: "A",
        payload: { title: "Changed" },
      }),
    );
    expect(
      client.getQueryState(["projects", "p", "tasks"])?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(["projects", "p", "sprints"])?.isInvalidated,
    ).toBe(true);
  });

  it.each(["attach", "detach", "update", "delete"] as const)(
    "refreshes task and sprint projections after label %s",
    async (operation) => {
      const { client, wrapper } = setup();
      vi.spyOn(labelApi, "attachLabel").mockResolvedValue({
        id: "label",
        name: "New",
        color: "#fff",
        projectId: "p",
      });
      vi.spyOn(labelApi, "detachLabel").mockResolvedValue(undefined);
      vi.spyOn(labelApi, "updateLabel").mockResolvedValue({
        id: "label",
        name: "New",
        color: "#fff",
        projectId: "p",
      });
      vi.spyOn(labelApi, "deleteLabel").mockResolvedValue(undefined);
      const { result } = renderHook(
        () => ({
          attach: useAttachLabel("p"),
          detach: useDetachLabel("p"),
          update: useUpdateLabel("p"),
          delete: useDeleteLabel("p"),
        }),
        { wrapper },
      );
      const keys = [
        ["projects", "p", "tasks"],
        ["projects", "p", "sprints"],
        ["projects", "p", "labels"],
      ];
      keys.forEach((key) => client.setQueryData(key, []));
      await act(async () => {
        if (operation === "update")
          await result.current.update.mutateAsync({
            labelId: "label",
            payload: { name: "New" },
          });
        else if (operation === "delete")
          await result.current.delete.mutateAsync("label");
        else
          await result.current[operation].mutateAsync({
            taskId: "A",
            labelId: "label",
          });
      });
      keys.forEach((key) =>
        expect(client.getQueryState(key)?.isInvalidated).toBe(true),
      );
    },
  );

  it("creates a sprint task with one request and uses sortable ranks", async () => {
    const createTask = vi.fn().mockResolvedValue(task("A"));
    const addTasksToSprint = vi.fn();
    const updateTask = vi.fn();
    const actions = createProjectGroupActions({
      formatMessage: (id) => id,
      tasks: [],
      editingGroup: null,
      setEditingGroup: vi.fn(),
      setSelectedTask: vi.fn(),
      rejectChange: () => false,
      createTask,
      updateTask,
      addTasksToSprint,
    });
    await actions.createSprintTask("sprint", "Title");
    expect(createTask).toHaveBeenCalledWith({
      title: "Title",
      status: TaskStatus.TODO,
      sprintId: "sprint",
    });
    expect(addTasksToSprint).not.toHaveBeenCalled();
    await actions.reorderTasks(
      task("group"),
      Array.from({ length: 12 }, (_, i) => task(String(i))),
    );
    const ranks = updateTask.mock.calls.map(([input]) => input.payload.rank);
    expect([...ranks].sort()).toEqual(ranks);
  });

  it("loads separate persisted discussion histories when switching tasks", async () => {
    const { wrapper } = setup();
    const stored: Record<string, commentApi.CreateTaskCommentPayload[]> = {
      A: [],
      B: [],
    };
    const asComments = (id: string) =>
      stored[id].map((item, i) => ({
        ...item,
        id: `${id}-${i}`,
        taskId: id,
        authorId: "user",
        authorName: "Me",
        edited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    vi.spyOn(commentApi, "getTaskComments").mockImplementation(async (id) =>
      asComments(id),
    );
    const send = vi
      .spyOn(commentApi, "createTaskComment")
      .mockImplementation(async (id, payload) => {
        stored[id].push(payload);
        return asComments(id).at(-1)!;
      });
    const view = render(
      <TaskChatDialog
        task={task("A")}
        members={[]}
        canComment
        onClose={vi.fn()}
      />,
      { wrapper },
    );
    expect(
      screen.getByLabelText("Test User").getAttribute("data-avatar-url"),
    ).toBe("https://cdn.example.com/avatar.png");
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Message for A" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    await screen.findByText("Message for A");
    expect(send).toHaveBeenCalledWith("A", { content: "Message for A" });
    view.rerender(
      <TaskChatDialog
        task={task("B")}
        members={[]}
        canComment
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.queryByText("Message for A")).toBeNull());
    view.unmount();
    const next = setup();
    render(
      <TaskChatDialog
        task={task("A")}
        members={[]}
        canComment
        onClose={vi.fn()}
      />,
      { wrapper: next.wrapper },
    );
    await screen.findByText("Message for A");
  });

  it("shows measured current progress without fabricated history or counting cancelled as done", () => {
    const tasks = [
      { ...task("A"), sprintId: "s", status: TaskStatus.DONE },
      { ...task("B"), sprintId: "s", status: TaskStatus.CANCELLED },
    ];
    const view = render(
      <SprintMetricsView
        sprints={[{ id: "s", name: "Sprint" } as Sprint]}
        tasks={tasks}
      />,
    );
    expect(screen.getByRole("progressbar").getAttribute("value")).toBe("1");
    expect(screen.getByRole("progressbar").getAttribute("max")).toBe("2");
    expect(view.container.querySelector("svg")).toBeNull();
  });
});

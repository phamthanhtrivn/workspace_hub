import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { toast } from 'sonner';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
  ProjectRole,
  SprintStatus,
  type TaskAssignee,
  type ProjectMember,
  type Task,
  type TaskDependency,
  type Sprint,
} from "@/features/project/types/project";
import type { DragEvent } from "react";
import { useProjectSummaryMetrics } from "./use-project-summary-metrics";
import { useBacklogManager } from "./use-backlog-manager";
import { useTaskDetailDrawerState } from "./use-task-detail-drawer-state";
import { useCalendarGrid } from "./use-calendar-grid";
import { useGanttTimeline } from "./use-gantt-timeline";

vi.mock("@/features/project/hooks/use-tasks", () => ({
  useTaskActivities: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/features/project/hooks/use-project-files", () => ({
  useProjectFiles: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    upload: { mutateAsync: vi.fn() },
    remove: { mutateAsync: vi.fn() },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

function mockTask(partial: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    projectId: "project-1",
    taskNumber: 1,
    title: "Test Task",
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    taskType: TaskType.TASK,
    createdBy: "user-1",
    labels: [],
    assignees: [],
    checklists: [],
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  } as unknown as Task;
}

function assignee(taskId: string, userId: string): TaskAssignee {
  return { id: `${taskId}-${userId}`, taskId, userId, displayName: userId, assignedAt: '2026-09-06T00:00:00Z' };
}

function member(userId: string, displayName: string): ProjectMember {
  return {
    id: userId, projectId: 'project-1', userId, displayName, role: ProjectRole.MEMBER,
    canCreateTask: false, canEditOwnTask: false, canEditOthersTask: false,
    canManageSprints: false, canManageMembers: false, canManageLabels: false,
    joinedAt: '2026-09-06T00:00:00Z',
  };
}

describe("Custom Hooks for Project Service", () => {
  describe("useProjectSummaryMetrics", () => {
    it('counts unassigned tasks independently of tasks shared by multiple assignees', () => {
      const tasks = [mockTask({ id: 'shared', assignees: [assignee('shared', 'u1'), assignee('shared', 'u2')] }), mockTask({ id: 'unassigned' })];
      const { result } = renderHook(() => useProjectSummaryMetrics(tasks, [member('u1', 'Alice'), member('u2', 'Bob')]));
      expect(result.current.workloadItems[0].count).toBe(1);
    });

    it("computes status, priority, and workload metrics accurately", () => {
      const tasks: Task[] = [
        mockTask({
          id: "t1",
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          assignees: [assignee('t1', 'u1')],
        }),
        mockTask({
          id: "t2",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          assignees: [assignee('t2', 'u1')],
        }),
        mockTask({
          id: "t3",
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          assignees: [assignee('t3', 'u2')],
        }),
      ];

      const members: ProjectMember[] = [
        member('u1', 'Alice'),
        member('u2', 'Bob'),
      ];

      const { result } = renderHook(() =>
        useProjectSummaryMetrics(tasks, members),
      );

      expect(result.current.workItems).toHaveLength(3);
      expect(result.current.donePercent).toBe(33);
      expect(result.current.completionPercent).toBe(33);
      expect(result.current.completed).toHaveLength(1);
      expect(result.current.workloadItems.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("useBacklogManager", () => {
    it("manages task selection and bulk status operations", async () => {
      const tasks = [mockTask({ id: "t1" }), mockTask({ id: "t2" })];
      const onBulkUpdateTasks = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useBacklogManager({
          projectId: "p1",
          tasks,
          sprints: [],
          onCreateSprint: vi.fn(),
          onUpdateSprint: vi.fn(),
          onAddTasksToSprint: vi.fn(),
          onBulkUpdateTasks,
        }),
      );

      act(() => {
        result.current.toggleTask("t1");
      });
      expect(result.current.selectedTaskIds).toContain("t1");

      await act(async () => {
        await result.current.handleBulkStatus();
      });
      expect(onBulkUpdateTasks).toHaveBeenCalledWith(
        ["t1"],
        TaskStatus.IN_PROGRESS,
      );
      expect(result.current.selectedTaskIds).toHaveLength(0);
    });

    it("moves tasks between backlog and planned sprints only for sprint managers", async () => {
      const task = mockTask({ id: "t1" });
      const sprint = {
        id: "s1",
        projectId: "p1",
        name: "Sprint 1",
        status: SprintStatus.PLANNED,
        createdBy: "owner",
        createdAt: "2026-09-12T00:00:00.000Z",
        updatedAt: "2026-09-12T00:00:00.000Z",
        tasks: [],
      } satisfies Sprint;
      const onAddTasksToSprint = vi.fn().mockResolvedValue(undefined);
      const onRemoveTaskFromSprint = vi.fn().mockResolvedValue(undefined);
      const dragEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn(() => JSON.stringify({ taskId: "t1" })),
        },
      } as unknown as DragEvent;

      const { result, rerender } = renderHook(
        ({ canManageSprints }) =>
          useBacklogManager({
            projectId: "p1",
            tasks: [task],
            sprints: [sprint],
            canManageSprints,
            onCreateSprint: vi.fn(),
            onUpdateSprint: vi.fn(),
            onAddTasksToSprint,
            onRemoveTaskFromSprint,
          }),
        { initialProps: { canManageSprints: false } },
      );

      await act(() => result.current.handleDropOnSprint(dragEvent, sprint));
      expect(onAddTasksToSprint).not.toHaveBeenCalled();

      vi.mocked(dragEvent.dataTransfer.getData).mockReturnValue(
        JSON.stringify({ taskId: "t1", sprintId: "s1" }),
      );
      await act(() => result.current.handleDropOnBacklog(dragEvent));
      expect(onRemoveTaskFromSprint).not.toHaveBeenCalled();

      rerender({ canManageSprints: true });
      vi.mocked(dragEvent.dataTransfer.getData).mockReturnValue(
        JSON.stringify({ taskId: "t1" }),
      );
      await act(() => result.current.handleDropOnSprint(dragEvent, sprint));
      expect(onAddTasksToSprint).toHaveBeenCalledWith("s1", ["t1"]);

      vi.mocked(dragEvent.dataTransfer.getData).mockReturnValue(
        JSON.stringify({ taskId: "t1", sprintId: "s1" }),
      );
      await act(() => result.current.handleDropOnBacklog(dragEvent));
      expect(onRemoveTaskFromSprint).toHaveBeenCalledWith("s1", "t1");
    });
  });

  describe("useTaskDetailDrawerState", () => {
    it('does not announce success when saving the title fails', async () => {
      vi.mocked(toast.success).mockClear();
      const task = mockTask({ title: 'Original' });
      const { result } = renderHook(() => useTaskDetailDrawerState({ task, onClose: vi.fn(), canEditTask: true, onUpdateTask: vi.fn().mockRejectedValue(new Error('HTTP 500')) }));
      act(() => result.current.setTempTitle('Changed'));
      await act(() => result.current.handleTitleSave());
      expect(toast.success).not.toHaveBeenCalled();
      expect(result.current.tempTitle).toBe('Original');
    });

    it("initializes draft inputs and updates title via onUpdateTask", async () => {
      const task = mockTask({
        id: "t1",
        title: "Original Title",
        description: "Original Desc",
      });
      const onUpdateTask = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      const { result } = renderHook(() =>
        useTaskDetailDrawerState({
          task,
          onClose,
          onUpdateTask,
          canEditTask: true,
        }),
      );

      expect(result.current.tempTitle).toBe("Original Title");
      expect(result.current.isReadOnly).toBe(false);

      act(() => {
        result.current.setIsEditingTitle(true);
        result.current.setTempTitle("Updated Title");
      });

      await act(async () => {
        await result.current.handleTitleSave();
      });

      expect(onUpdateTask).toHaveBeenCalledWith("t1", {
        title: "Updated Title",
      });
      expect(result.current.isEditingTitle).toBe(false);
    });
  });

  describe("useCalendarGrid", () => {
    it("generates a 42-day calendar matrix and maps dated tasks", () => {
      const task = mockTask({
        id: "t1",
        startDate: "2026-09-10T09:00:00Z",
        dueDate: "2026-09-10T18:00:00Z",
      });

      const { result } = renderHook(() => useCalendarGrid({ tasks: [task] }));

      expect(result.current.days).toHaveLength(42);
      const matchingDay = result.current.days.find((d) =>
        d.tasks.some((t) => t.id === "t1"),
      );
      expect(matchingDay).toBeDefined();

      act(() => {
        result.current.moveMonth(1);
      });
      expect(result.current.days).toHaveLength(42);
    });
  });

  describe("useGanttTimeline", () => {
    it("computes timeline range, width, and task coordinates", () => {
      const taskA = mockTask({
        id: "tA",
        title: "Task A",
        startDate: "2026-09-01T00:00:00Z",
        dueDate: "2026-09-05T00:00:00Z",
      });
      const taskB = mockTask({
        id: "tB",
        title: "Task B",
        startDate: "2026-09-06T00:00:00Z",
        dueDate: "2026-09-10T00:00:00Z",
      });
      const dependencies: TaskDependency[] = [
        { id: "dep-1", successorTaskId: "tB", predecessorTaskId: "tA", projectId: 'project-1', dependencyType: 'FINISH_TO_START', createdBy: 'user-1', createdAt: '2026-09-06T00:00:00Z' },
      ];

      const { result } = renderHook(() =>
        useGanttTimeline({ tasks: [taskA, taskB], dependencies }),
      );

      expect(result.current.datedTasks).toHaveLength(2);
      expect(result.current.timelineWidth).toBeGreaterThan(0);
      const itemB = result.current.datedTasks.find(
        (item) => item.task.id === "tB",
      );
      expect(itemB?.predecessors[0]?.id).toBe("tA");
      expect(itemB?.left).toBeGreaterThan(0);
      expect(itemB?.width).toBeGreaterThanOrEqual(32);
    });
  });
});

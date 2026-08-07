"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  type Task,
  type TaskAssignee,
  ProjectType,
  ProjectStatus,
  TaskStatus,
} from "@/types/project";
import { useAppSelector } from "@/store/store";
import {
  useProject,
  useProjectMembers,
  useUpdateProject,
  useArchiveProject,
} from "@/features/project/hooks/use-projects";
import {
  useAddTasksToSprint,
  useCompleteSprint,
  useCreateSprint,
  useProjectSprints,
  useStartSprint,
  useUpdateSprint,
  useReopenSprint,
  useRemoveTaskFromSprint,
} from "@/features/project/hooks/use-sprints";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateTask,
  useProjectTasks,
  useUpdateTask,
  useCreateChecklist,
  useUpdateChecklist,
  useDeleteChecklist,
  taskKeys,
} from "@/features/project/hooks/use-tasks";
import {
  useProjectLabels,
  useCreateLabel,
  useDeleteLabel,
  useAttachLabel,
  useDetachLabel,
} from "@/features/project/hooks/use-labels";
import type { UpdateTaskPayload } from "@/features/project/api/task.api";
import { useCreateTaskDependency, useDeleteTaskDependency, useProjectDependencies } from "@/features/project/hooks/use-dependencies";
import { ProjectTypeBadge } from "@/components/projects/project-type-badge";
import { AvatarStack } from "@/components/projects/avatar-stack";
import BoardView from "@/components/projects/board-view";
import ListView from "@/components/projects/list-view";
import CalendarView from "@/components/projects/calendar-view";
import GanttView from "@/components/projects/gantt-view";
import SoftwareBacklogView, {
  type SprintCreateValues,
} from "@/components/projects/software-backlog-view";
import SummaryView from "@/components/projects/summary-view";
import GeneralSummaryView from "@/components/projects/general-summary-view";
import TaskDetailDrawer from "@/components/projects/task-detail-drawer";
import TaskChatDialog from "@/components/projects/task-chat-dialog";
import TaskFormDialog, {
  type TaskFormValues,
} from "@/components/projects/task-form-dialog";
import SprintEditDialog, {
  type SprintFormValues,
} from "@/components/projects/sprint-edit-dialog";
import ProjectMembersPanel from "@/components/projects/project-members-panel";
import ProjectSettingsDialog from "@/components/projects/project-settings-dialog";
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Calendar,
  Plus,
  Settings,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ChartGantt,
} from "lucide-react";
import { getProjectKey } from "../page";
import { useProjectRealtime } from "@/features/project/hooks/use-project-realtime";

type TaskDrawerUpdatePayload = UpdateTaskPayload & {
  assignees?: TaskAssignee[];
  assigneeUserId?: string | null;
};

type ViewMode = "summary" | "board" | "list" | "calendar" | "gantt" | "members";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  useProjectRealtime(projectId);
  const { data: project, isLoading, isError } = useProject(projectId);
  const { data: members = [] } = useProjectMembers(projectId);
  const { data: sprints = [] } = useProjectSprints(
    projectId,
    project?.projectType === ProjectType.SOFTWARE_DEVELOPMENT,
  );
  const {
    data: serverTasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
  } = useProjectTasks(projectId);
  const createTaskMutation = useCreateTask(projectId);
  const updateTaskMutation = useUpdateTask(projectId);
  const updateProjectMutation = useUpdateProject(projectId);
  const archiveProjectMutation = useArchiveProject(projectId);
  const createChecklistMutation = useCreateChecklist(projectId);
  const updateChecklistMutation = useUpdateChecklist(projectId);
  const deleteChecklistMutation = useDeleteChecklist(projectId);
  const { data: labels = [] } = useProjectLabels(projectId);
  const { data: dependencies = [] } = useProjectDependencies(projectId);
  const createDependencyMutation = useCreateTaskDependency(projectId);
  const deleteDependencyMutation = useDeleteTaskDependency(projectId);
  const createLabelMutation = useCreateLabel(projectId);
  const deleteLabelMutation = useDeleteLabel(projectId);
  const attachLabelMutation = useAttachLabel(projectId);
  const detachLabelMutation = useDetachLabel(projectId);
  const createSprintMutation = useCreateSprint(projectId);
  const addTasksToSprintMutation = useAddTasksToSprint(projectId);
  const startSprintMutation = useStartSprint(projectId);
  const completeSprintMutation = useCompleteSprint(projectId);
  const updateSprintMutation = useUpdateSprint(projectId);
  const reopenSprintMutation = useReopenSprint(projectId);
  const removeTaskFromSprintMutation = useRemoveTaskFromSprint(projectId);

  const { userId: currentUserId } = useAppSelector((state) => state.auth);

  // States
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [chatTask, setChatTask] = useState<Task | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingSprint, setEditingSprint] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [newTaskStartDate, setNewTaskStartDate] = useState<string | undefined>();
  const [newTaskAllDay, setNewTaskAllDay] = useState(false);
  const [newTaskParentId, setNewTaskParentId] = useState<string | undefined>();
  const [newTaskSprintId, setNewTaskSprintId] = useState<string | undefined>();
  const [newTaskIsParentTask, setNewTaskIsParentTask] = useState(false);

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleToggleLabel = async (taskId: string, labelId: string, attached: boolean) => {
    if (attached) {
      await detachLabelMutation.mutateAsync({ taskId, labelId });
    } else {
      await attachLabelMutation.mutateAsync({ taskId, labelId });
    }
    const label = labels.find((item) => item.id === labelId);
    setSelectedTask((current) => {
      if (!current || current.id !== taskId || !label) return current;
      return {
        ...current,
        labels: attached
          ? current.labels.filter((item) => item.id !== labelId)
          : [...current.labels, label],
      };
    });
  };

  const handleCreateDependency = async (successorTaskId: string, predecessorTaskId: string) => {
    await createDependencyMutation.mutateAsync({ successorTaskId, predecessorTaskId });
    toast.success("Đã tạo dependency");
  };

  const handleDeleteDependency = async (successorTaskId: string, predecessorTaskId: string) => {
    await deleteDependencyMutation.mutateAsync({ successorTaskId, predecessorTaskId });
  };

  const handleCreateLabel = async (payload: { name: string; color: string }) => {
    try {
      await createLabelMutation.mutateAsync(payload);
      toast.success("Đã tạo label");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo label");
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!window.confirm("Xóa label này khỏi Project? Các task đang dùng label sẽ bị bỏ nhãn.")) return;
    try {
      await deleteLabelMutation.mutateAsync(labelId);
      toast.success("Đã xóa label");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa label");
    }
  };

  // Filters state
  const [activeAssigneeFilters, setActiveAssigneeFilters] = useState<string[]>([]);
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);

  const [taskStatusOverrides, setTaskStatusOverrides] = useState<
    Record<string, TaskStatus>
  >({});

  const tasks = useMemo(
    () =>
      serverTasks.map((task) => ({
        ...task,
        status: taskStatusOverrides[task.id] || task.status,
        assignees: task.assignees.map((assignee) => ({
          ...assignee,
          displayName: members.find((member) => member.userId === assignee.userId)?.displayName || assignee.displayName,
          avatarUrl: members.find((member) => member.userId === assignee.userId)?.avatarUrl || assignee.avatarUrl,
        })),
      })),
    [serverTasks, taskStatusOverrides, members],
  );

  // Process filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search filter
      const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());

      // Assignee filter
      let matchesAssignee = true;
      if (activeAssigneeFilters.length > 0) {
        matchesAssignee = t.assignees.some((a) => activeAssigneeFilters.includes(a.userId));
      }

      // "Only my issues" filter
      let matchesMyIssues = true;
      if (onlyMyIssues && currentUserId) {
        matchesMyIssues = t.assignees.some((a) => a.userId === currentUserId);
      }

      return matchesSearch && matchesAssignee && matchesMyIssues;
    });
  }, [tasks, searchQuery, activeAssigneeFilters, onlyMyIssues, currentUserId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm font-semibold text-slate-400">
        Đang tải thông tin dự án...
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-2xl">
          📭
        </div>
        <p className="mt-4 text-sm font-bold text-slate-600">Không tìm thấy dự án</p>
        <Link
          href="/projects"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#0052CC] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Quay lại danh sách dự án
        </Link>
      </div>
    );
  }

  const projectKey = getProjectKey(project.name);
  const projectWithMembers = { ...project, members };
  const isSoftwareProject = project.projectType === ProjectType.SOFTWARE_DEVELOPMENT;
  const viewTitle: Record<ViewMode, string> = {
    summary: "Summary",
    board: "Kanban Board",
    list: isSoftwareProject ? "Backlog" : "Công việc",
    calendar: "Calendar",
    gantt: "Gantt chart",
    members: "Thành viên dự án",
  };

  const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
    const previousStatus = tasks.find((task) => task.id === taskId)?.status;
    setTaskStatusOverrides((prev) => ({ ...prev, [taskId]: newStatus }));

    updateTaskMutation.mutate(
      { taskId, payload: { status: newStatus } },
      {
        onSuccess: () => {
          setTaskStatusOverrides((prev) => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });
        },
        onError: () => {
          if (previousStatus) {
            setTaskStatusOverrides((prev) => ({
              ...prev,
              [taskId]: previousStatus,
            }));
          }
          toast.error("Không thể cập nhật trạng thái task");
        },
      },
    );
  };

  const handleSaveProjectSettings = async (payload: { name: string; description: string; status: ProjectStatus; startDate: string | null; dueDate: string | null }) => {
    try {
      await updateProjectMutation.mutateAsync(payload);
      setShowProjectSettings(false);
      toast.success("Đã cập nhật Project");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật Project");
    }
  };

  const handleArchiveProject = async () => {
    if (!window.confirm("Bạn có chắc muốn archive Project này không?")) return;
    try {
      await archiveProjectMutation.mutateAsync();
      window.location.assign("/projects");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể archive Project");
    }
  };

  const handleTaskSubmit = async (values: TaskFormValues) => {
    try {
      if (editingTask) {
        const payload = editingTask.parentTaskId && !values.parentTaskId
          ? { ...values, clearParent: true }
          : values;
        await updateTaskMutation.mutateAsync({
          taskId: editingTask.id,
          payload,
        });
        toast.success("Cập nhật task thành công");
      } else {
        const createdTask = await createTaskMutation.mutateAsync({
          ...values,
        });
        if (newTaskSprintId) {
          await addTasksToSprintMutation.mutateAsync({
            sprintId: newTaskSprintId,
            taskIds: [createdTask.id],
          });
        }
        toast.success("Tạo task thành công");
      }

      setShowTaskForm(false);
      setEditingTask(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu task");
    }
  };

  const handleUpdateTaskDirect = async (
    taskId: string,
    payload: TaskDrawerUpdatePayload,
  ) => {
    try {
      // 1. Separate backend allowed keys from payload
      const backendKeys = ["title", "description", "status", "priority", "startDate", "dueDate", "allDay", "estimatedMinutes", "assigneeUserId"];
      const backendPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => backendKeys.includes(key)),
      ) as UpdateTaskPayload;
      const hasBackendChange = Object.keys(backendPayload).length > 0;

      // If backend change exists, execute PATCH mutation
      if (hasBackendChange) {
        await updateTaskMutation.mutateAsync({ taskId, payload: backendPayload });
      }

      // 2. Perform local cache update in React Query for instant UI updates (both backend & client-side fields like assignees/labels)
      queryClient.setQueryData(taskKeys.project(projectId), (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map((t) => {
          if (t.id !== taskId) return t;

          // Map assignee change from assigneeUserId
          let updatedAssignees = t.assignees;
          if (payload.assignees) {
            updatedAssignees = payload.assignees;
          } else if ("assigneeUserId" in payload) {
            const userId = payload.assigneeUserId;
            if (!userId) {
              updatedAssignees = [];
            } else {
              const member = members.find((m) => m.userId === userId);
              updatedAssignees = member
                ? [
                    {
                      id: `ta-${Date.now()}`,
                      taskId,
                      userId: member.userId,
                      displayName: member.displayName,
                      avatarUrl: member.avatarUrl,
                      assignedAt: new Date().toISOString(),
                    },
                  ]
                : [];
            }
          }

          return {
            ...t,
            ...payload,
            assignees: updatedAssignees,
          };
        });
      });

      // 3. Update the currently selected task reference so the drawer updates instantly
      setSelectedTask((prev) => {
        if (prev && prev.id === taskId) {
          let updatedAssignees = prev.assignees;
          if (payload.assignees) {
            updatedAssignees = payload.assignees;
          } else if ("assigneeUserId" in payload) {
            const userId = payload.assigneeUserId;
            if (!userId) {
              updatedAssignees = [];
            } else {
              const member = members.find((m) => m.userId === userId);
              updatedAssignees = member
                ? [
                    {
                      id: `ta-${Date.now()}`,
                      taskId,
                      userId: member.userId,
                      displayName: member.displayName,
                      avatarUrl: member.avatarUrl,
                      assignedAt: new Date().toISOString(),
                    },
                  ]
                : [];
            }
          }

          return {
            ...prev,
            ...payload,
            assignees: updatedAssignees,
          } as Task;
        }
        return prev;
      });

    // Axios errors expose response data at runtime; keep this boundary permissive.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Không thể cập nhật công việc";
      toast.error(msg);
      console.error("Update task error:", error?.response?.data || error);
    }
  };

  const handleCreateChecklist = async (taskId: string, title: string) => {
    const item = await createChecklistMutation.mutateAsync({ taskId, title });
    setSelectedTask((current) => current?.id === taskId ? { ...current, checklists: [...current.checklists, item] } : current);
    return item;
  };

  const handleUpdateChecklist = async (checklistId: string, completed: boolean) => {
    const item = await updateChecklistMutation.mutateAsync({ checklistId, completed });
    setSelectedTask((current) => current ? { ...current, checklists: current.checklists.map((checklist) => checklist.id === checklistId ? item : checklist) } : current);
    return item;
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    await deleteChecklistMutation.mutateAsync(checklistId);
    setSelectedTask((current) => current ? { ...current, checklists: current.checklists.filter((checklist) => checklist.id !== checklistId) } : current);
  };

  const handleEditGroup = (group: Task) => {
    setSelectedTask(null);
    setEditingSprint(group);
  };

  const handleSprintSubmit = async (values: SprintFormValues) => {
    if (!editingSprint) return;

    try {
      await updateTaskMutation.mutateAsync({
        taskId: editingSprint.id,
        payload: {
          title: values.name,
          startDate: values.startDate,
          dueDate: values.endDate,
          description: values.goal,
          allDay: false,
          autoCompleteSprint: values.autoCompleteSprint,
        },
      });
      setEditingSprint(null);
      toast.success("Cập nhật sprint thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật sprint");
    }
  };

  const handleDeleteGroup = async (group: Task) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Xóa nhóm "${group.title}"? Các task bên trong sẽ được chuyển về Backlog.`,
      )
    ) {
      return;
    }

    try {
      const children = tasks.filter((task) => task.parentTaskId === group.id);
      await Promise.all(
        children.map((task) =>
          updateTaskMutation.mutateAsync({
            taskId: task.id,
            payload: { clearParent: true },
          }),
        ),
      );
      await updateTaskMutation.mutateAsync({
        taskId: group.id,
        payload: { archived: true, isParentTask: false },
      });
      setSelectedTask(null);
      toast.success("Đã xóa sprint và chuyển task về Backlog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa sprint");
    }
  };

  const handleReorderTasks = async (group: Task, orderedTasks: Task[]) => {
    try {
      await Promise.all(
        orderedTasks.map((task, index) =>
          updateTaskMutation.mutateAsync({
            taskId: task.id,
            payload: { rank: String((index + 1) * 1000) },
          }),
        ),
      );
      toast.success(`Đã sắp xếp lại work items trong "${group.title}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể sắp xếp work items");
    }
  };

  const handleCreateTaskInline = async (
    title: string,
    parentTaskId?: string,
    isParentTask = false,
  ) => {
    try {
      const payload = {
        title: title.trim(),
        ...(parentTaskId ? { parentTaskId } : {}),
        ...(isParentTask ? { isParentTask: true } : {}),
      };

      await createTaskMutation.mutateAsync({
        ...payload,
      });
      toast.success("Tạo công việc thành công");
    // Axios errors expose response data at runtime; keep this boundary permissive.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // Extract backend error message from Axios response
      const backendMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : "Không thể tạo công việc");
      toast.error(backendMessage);
      console.error("Create task error:", error?.response?.data || error);
    }
  };

  const handleCreateSprintTask = async (sprintId: string, title: string) => {
    try {
      const createdTask = await createTaskMutation.mutateAsync({
        title,
        status: TaskStatus.TODO,
      });
      await addTasksToSprintMutation.mutateAsync({
        sprintId,
        taskIds: [createdTask.id],
      });
      toast.success("Tạo task trong Sprint thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo task trong Sprint");
      throw error;
    }
  };

  const openCreateTask = (
    status: TaskStatus = TaskStatus.TODO,
    startDate?: string,
    allDay = false,
    parentTaskId?: string,
    sprintId?: string,
  ) => {
    setEditingTask(null);
    setNewTaskStatus(status);
    setNewTaskStartDate(startDate);
    setNewTaskAllDay(allDay);
    setNewTaskParentId(parentTaskId);
    setNewTaskSprintId(sprintId);
    setNewTaskIsParentTask(!isSoftwareProject && !parentTaskId);
    setShowTaskForm(true);
  };

  const handleCreateSprint = async (values: SprintCreateValues) => {
    try {
      await createSprintMutation.mutateAsync(values);
      toast.success("Tạo Sprint thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo Sprint");
      throw error;
    }
  };

  const handleAddTasksToSprint = async (sprintId: string, taskIds: string[]) => {
    try {
      await addTasksToSprintMutation.mutateAsync({ sprintId, taskIds });
      toast.success("Đã đưa task vào Sprint");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể đưa task vào Sprint");
      throw error;
    }
  };

  const handleBulkUpdateTasks = async (taskIds: string[], status: TaskStatus) => {
    try {
      await Promise.all(taskIds.map((taskId) => updateTaskMutation.mutateAsync({ taskId, payload: { status } })));
      toast.success(`Đã cập nhật ${taskIds.length} task`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật hàng loạt task");
      throw error;
    }
  };

  const handleUpdateSprint = async (sprintId: string, values: SprintCreateValues) => {
    try {
      await updateSprintMutation.mutateAsync({ sprintId, payload: values });
      toast.success("Đã cập nhật Sprint");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật Sprint");
      throw error;
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      await startSprintMutation.mutateAsync(sprintId);
      toast.success("Đã Start Sprint");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể Start Sprint");
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try {
      await completeSprintMutation.mutateAsync(sprintId);
      toast.success("Đã Complete Sprint; task chưa xong quay lại Backlog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể Complete Sprint");
    }
  };

  const handleReopenSprint = async (sprintId: string) => {
    try {
      await reopenSprintMutation.mutateAsync(sprintId);
      toast.success("Đã mở lại Sprint ở trạng thái Planned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở lại Sprint");
    }
  };

  const handleRemoveTaskFromSprint = async (sprintId: string, taskId: string) => {
    try {
      await removeTaskFromSprintMutation.mutateAsync({ sprintId, taskId });
      toast.success("Đã đưa task về Backlog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể đưa task về Backlog");
      throw error;
    }
  };

  const toggleAssigneeFilter = (userId: string) => {
    setActiveAssigneeFilters((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const clearAllFilters = () => {
    setActiveAssigneeFilters([]);
    setOnlyMyIssues(false);
    setSearchQuery("");
  };

  const isFiltersActive = activeAssigneeFilters.length > 0 || onlyMyIssues || searchQuery.length > 0;

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* ── Collapsible Project Sidebar (Jira style) ── */}
      <aside
        className={[
          "flex flex-col border-r border-slate-200 bg-[#F4F5F7] transition-all duration-300 relative select-none",
          isSidebarCollapsed ? "w-0 overflow-hidden" : "w-60 shrink-0",
        ].join(" ")}
      >
        {/* Project Header in Sidebar */}
        <div className="p-4 flex items-center gap-2.5 border-b border-slate-200">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded bg-white text-lg border border-slate-200 font-bold"
            style={{ color: project.color }}
          >
            {project.icon || "📁"}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#172B4D]">
              {project.name}
            </h2>
            <div className="mt-1">
              <ProjectTypeBadge type={project.projectType} compact />
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Menu */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <button
            onClick={() => setViewMode("summary")}
            className={[
              "w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded transition",
              viewMode === "summary"
                ? "bg-[#DEEBFF] text-[#0747A6]"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
            ].join(" ")}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Summary</span>
          </button>

          <button
            onClick={() => setViewMode("board")}
            className={[
              "w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded transition",
              viewMode === "board"
                ? "bg-[#DEEBFF] text-[#0747A6]"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
            ].join(" ")}
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            <span>Kanban Board</span>
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={[
              "w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded transition",
              viewMode === "list"
                ? "bg-[#DEEBFF] text-[#0747A6]"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
            ].join(" ")}
          >
            <List className="h-4 w-4 shrink-0" />
            <span>{isSoftwareProject ? "Backlog" : "Công việc"}</span>
          </button>

          <button
            onClick={() => setViewMode("calendar")}
            className={[
              "w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded transition",
              viewMode === "calendar"
                ? "bg-[#DEEBFF] text-[#0747A6]"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
            ].join(" ")}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Lịch trình (Calendar)</span>
          </button>

          <button
            onClick={() => setViewMode("gantt")}
            className={[
              "w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded transition",
              viewMode === "gantt"
                ? "bg-[#DEEBFF] text-[#0747A6]"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
            ].join(" ")}
          >
            <ChartGantt className="h-4 w-4 shrink-0" />
            <span>Gantt chart</span>
          </button>

          <div className="h-px bg-slate-200 my-4" />

          <button
            onClick={() => setViewMode("members")}
            className={[
              "w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded transition",
              viewMode === "members"
                ? "bg-[#DEEBFF] text-[#0747A6]"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
            ].join(" ")}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Thành viên ({projectWithMembers.members.length})</span>
          </button>
        </nav>

        {/* Bottom branding or configuration */}
        <div className="p-4 border-t border-slate-200 bg-slate-100/50">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Mã dự án: <strong>{projectKey}</strong></span>
            <button onClick={() => setShowProjectSettings(true)} className="text-slate-400 hover:text-slate-600" title="Cài đặt Project">
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Toggle Handle */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="relative z-30 w-3 -ml-1 flex items-center justify-center hover:bg-slate-200 group border-r border-slate-200 transition-colors"
        title={isSidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
      >
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white rounded-full border border-slate-200 shadow-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          {isSidebarCollapsed ? (
            <ChevronRight className="h-3 w-3 text-slate-500" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-slate-500" />
          )}
        </div>
      </button>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/projects" className="hover:text-blue-600 transition">Dự án</Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span>{project.name}</span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-700 capitalize">
            {viewTitle[viewMode]}
          </span>
        </div>

        {/* View Header */}
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#172B4D] flex items-center gap-2">
              {viewTitle[viewMode]}
              <ProjectTypeBadge type={project.projectType} compact />
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span>Xem thành viên</span>
            </button>
            <button
              type="button"
              onClick={() => openCreateTask()}
              className="inline-flex items-center gap-1.5 rounded bg-[#0052CC] hover:bg-[#0747A6] px-3 py-1.5 text-xs font-bold text-white transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Tạo công việc
            </button>
          </div>
        </div>

        {/* ── Jira Filters Toolbar ── */}
        {project.projectType === ProjectType.SOFTWARE_DEVELOPMENT && (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs font-semibold text-indigo-800">
            <span className="font-bold">Software workflow</span>
            <span>Backlog</span>
            <span>Sprint</span>
            <span>Code review</span>
            <span>Release</span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm công việc..."
              className="w-48 sm:w-56 rounded border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-[#172B4D] outline-none transition placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
            />
          </div>

          {/* Member filters (Avatars) */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 font-semibold mr-1">Giao cho:</span>
            <div className="flex -space-x-1.5">
              {projectWithMembers.members.map((member) => {
                const isSelected = activeAssigneeFilters.includes(member.userId);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleAssigneeFilter(member.userId)}
                    title={member.displayName}
                    className={[
                      "relative rounded-full transition-transform ring-2",
                      isSelected
                        ? "ring-[#0052CC] scale-110 z-10"
                        : "ring-white hover:scale-105 hover:z-10",
                    ].join(" ")}
                  >
                    <AvatarStack
                      users={[
                        {
                          userId: member.userId,
                          displayName: member.displayName,
                          avatarUrl: member.avatarUrl,
                        },
                      ]}
                      size="xs"
                      max={1}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Buttons */}
          <button
            onClick={() => setOnlyMyIssues(!onlyMyIssues)}
            className={[
              "rounded px-2.5 py-1.5 text-xs font-semibold transition border",
              onlyMyIssues
                ? "bg-[#EAE6FF] text-[#403294] border-[#C0B6F2]"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50",
            ].join(" ")}
          >
            Chỉ của tôi
          </button>

          {/* Clear Filters */}
          {isFiltersActive && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-[#0052CC] hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}


          {/* Task status indicator counts */}
          <div className="ml-auto flex items-center gap-3 text-[11px] font-bold text-slate-500 bg-slate-100 rounded px-2.5 py-1">
            <span>To Do: {tasks.filter(t => t.status === TaskStatus.TODO && !t.archived).length}</span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="text-blue-600">In Progress: {tasks.filter(t => t.status === TaskStatus.IN_PROGRESS && !t.archived).length}</span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="text-emerald-600">Done: {tasks.filter(t => t.status === TaskStatus.DONE && !t.archived).length}</span>
          </div>
        </div>

        {/* ── Content View ── */}
        <div className="mt-5 flex gap-5 flex-1 min-h-0 overflow-hidden relative">
          {/* Main content */}
          <div className="min-w-0 flex-1 overflow-y-auto pr-1">
            {tasksLoading && (
              <div className="rounded border border-slate-200 bg-white py-24 text-center text-sm font-semibold text-slate-400">
                Đang tải công việc...
              </div>
            )}
            {tasksError && (
              <div className="rounded border border-red-100 bg-red-50 py-24 text-center text-sm font-semibold text-red-500">
                Không thể tải danh sách công việc. Vui lòng kiểm tra lại dịch vụ backend.
              </div>
            )}
            {!tasksLoading && !tasksError && viewMode === "summary" && (
              isSoftwareProject ? (
                <SummaryView
                  tasks={filteredTasks}
                  members={projectWithMembers.members}
                  sprints={sprints}
                />
              ) : (
                <GeneralSummaryView
                  tasks={filteredTasks}
                  members={projectWithMembers.members}
                />
              )
            )}
            {!tasksLoading && !tasksError && viewMode === "board" && (
              <BoardView
                tasks={filteredTasks}
                onTaskClick={(task) => setSelectedTask(task)}
                onOpenChat={(task) => setChatTask(task)}
                onTaskMove={handleTaskMove}
                onAddTask={openCreateTask}
              />
            )}
            {!tasksLoading && !tasksError && viewMode === "list" && (
              isSoftwareProject ? (
                <SoftwareBacklogView
                  tasks={filteredTasks}
                  sprints={sprints}
                  onTaskClick={(task) => setSelectedTask(task)}
                  onOpenChat={(task) => setChatTask(task)}
                  onCreateTask={(sprintId) => openCreateTask(TaskStatus.TODO, undefined, false, undefined, sprintId)}
                  onCreateSprintTask={handleCreateSprintTask}
                  onCreateSprint={handleCreateSprint}
                  onUpdateSprint={handleUpdateSprint}
                  onAddTasksToSprint={handleAddTasksToSprint}
                  onBulkUpdateTasks={handleBulkUpdateTasks}
                  onStartSprint={handleStartSprint}
                  onCompleteSprint={handleCompleteSprint}
                  onReopenSprint={handleReopenSprint}
                  onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
                  isBusy={
                    createSprintMutation.isPending
                    || addTasksToSprintMutation.isPending
                    || startSprintMutation.isPending
                    || completeSprintMutation.isPending
                    || updateSprintMutation.isPending
                    || reopenSprintMutation.isPending
                    || removeTaskFromSprintMutation.isPending
                  }
                />
              ) : (
                <ListView
                  tasks={filteredTasks}
                  projectType={project.projectType}
                  onTaskClick={(task) => setSelectedTask(task)}
                  onOpenChat={(task) => setChatTask(task)}
                  onAddTask={() => openCreateTask()}
                  onAddTaskInline={handleCreateTaskInline}
                  onAddSubtask={(task) =>
                    openCreateTask(TaskStatus.TODO, undefined, false, task.id)
                  }
                  onEditGroup={handleEditGroup}
                  onDeleteGroup={handleDeleteGroup}
                  onReorderTasks={handleReorderTasks}
                />
              )
            )}
            {!tasksLoading && !tasksError && viewMode === "calendar" && (
              <CalendarView
                tasks={filteredTasks}
                onTaskClick={(task) => setSelectedTask(task)}
                onCreateDate={(date) => openCreateTask(TaskStatus.TODO, date, true)}
              />
            )}
            {!tasksLoading && !tasksError && viewMode === "gantt" && (
              <GanttView
                tasks={filteredTasks}
                dependencies={dependencies}
                onTaskClick={(task) => setSelectedTask(task)}
              />
            )}
            {!tasksLoading && !tasksError && viewMode === "members" && (
              <div className="max-w-3xl">
                <ProjectMembersPanel
                  projectId={projectId}
                  members={projectWithMembers.members}
                />
              </div>
            )}
          </div>

          {/* Members sidebar (collapsible right panel) */}
          {showMembers && viewMode !== "members" && (
            <div className="hidden w-72 shrink-0 lg:block border-l border-slate-200 pl-4 overflow-y-auto">
              <ProjectMembersPanel
                projectId={projectId}
                members={projectWithMembers.members}
              />
            </div>
          )}

          {/* Jira-style Split Screen Task Detail Panel (Desktop inline) */}
          {selectedTask && (
            <div className="hidden lg:flex w-[400px] xl:w-[450px] shrink-0 border border-slate-200 rounded bg-white flex-col h-full overflow-hidden shadow-sm animate-in slide-in-from-right duration-200">
              <TaskDetailDrawer
                task={selectedTask}
                tasks={tasks}
                members={projectWithMembers.members}
                project={project}
                onClose={() => setSelectedTask(null)}
                onOpenChat={(task) => setChatTask(task)}
                onTaskClick={(task) => setSelectedTask(task)}
                onUpdateTask={handleUpdateTaskDirect}
                onCreateChecklist={handleCreateChecklist}
                onUpdateChecklist={handleUpdateChecklist}
                onDeleteChecklist={handleDeleteChecklist}
                labels={labels}
                onToggleLabel={handleToggleLabel}
                dependencies={dependencies}
                onCreateDependency={handleCreateDependency}
                onDeleteDependency={handleDeleteDependency}
                onCreateSubtask={(task) => {
                  setSelectedTask(null);
                  openCreateTask(TaskStatus.TODO, undefined, false, task.id);
                }}
                onEdit={(task) => {
                  setSelectedTask(null);
                  setNewTaskStatus(task.status);
                  setNewTaskStartDate(undefined);
                  setNewTaskAllDay(false);
                  setEditingTask(task);
                  setShowTaskForm(true);
                }}
                isInline={true}
              />
            </div>
          )}
        </div>
      </main>

      {/* ── Task detail drawer (Jira style right panel - Overlay version for mobile) ── */}
      {selectedTask && (
        <div className="lg:hidden">
          <TaskDetailDrawer
            task={selectedTask}
            tasks={tasks}
            members={projectWithMembers.members}
            project={project}
            onClose={() => setSelectedTask(null)}
            onOpenChat={(task) => setChatTask(task)}
            onTaskClick={(task) => setSelectedTask(task)}
            onUpdateTask={handleUpdateTaskDirect}
            onCreateChecklist={handleCreateChecklist}
            onUpdateChecklist={handleUpdateChecklist}
            onDeleteChecklist={handleDeleteChecklist}
            labels={labels}
            onToggleLabel={handleToggleLabel}
            dependencies={dependencies}
            onCreateDependency={handleCreateDependency}
            onDeleteDependency={handleDeleteDependency}
            onCreateSubtask={(task) => {
              setSelectedTask(null);
              openCreateTask(TaskStatus.TODO, undefined, false, task.id);
            }}
            onEdit={(task) => {
              setSelectedTask(null);
              setNewTaskStatus(task.status);
              setNewTaskStartDate(undefined);
              setNewTaskAllDay(false);
              setEditingTask(task);
              setShowTaskForm(true);
            }}
            isInline={false}
          />
        </div>
      )}

      <TaskChatDialog task={chatTask} onClose={() => setChatTask(null)} />

      <ProjectSettingsDialog
        project={project}
        open={showProjectSettings}
        isBusy={updateProjectMutation.isPending || archiveProjectMutation.isPending}
        onClose={() => setShowProjectSettings(false)}
        onSave={handleSaveProjectSettings}
        onArchive={handleArchiveProject}
        labels={labels}
        onCreateLabel={handleCreateLabel}
        onDeleteLabel={handleDeleteLabel}
      />

      <TaskFormDialog
        key={`${editingTask?.id ?? "new"}-${newTaskStatus}-${newTaskStartDate ?? ""}-${newTaskAllDay}-${newTaskParentId ?? ""}-${newTaskIsParentTask}`}
        open={showTaskForm}
        task={editingTask}
        projectName={project.name}
        parentTasks={tasks}
        initialParentTaskId={newTaskParentId}
        initialIsParentTask={newTaskIsParentTask}
        initialStatus={newTaskStatus}
        initialStartDate={newTaskStartDate}
        initialAllDay={newTaskAllDay}
        onClose={() => {
          setShowTaskForm(false);
          setEditingTask(null);
          setNewTaskStatus(TaskStatus.TODO);
          setNewTaskStartDate(undefined);
          setNewTaskAllDay(false);
          setNewTaskParentId(undefined);
          setNewTaskSprintId(undefined);
          setNewTaskIsParentTask(false);
        }}
        onSubmit={handleTaskSubmit}
        isSubmitting={
          createTaskMutation.isPending || updateTaskMutation.isPending
        }
      />

      <SprintEditDialog
        open={Boolean(editingSprint)}
        sprint={editingSprint}
        onClose={() => setEditingSprint(null)}
        onSubmit={handleSprintSubmit}
        isSubmitting={updateTaskMutation.isPending}
      />
    </div>
  );
}

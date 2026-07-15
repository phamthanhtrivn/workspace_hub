"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { type Task, TaskStatus } from "@/types/project";
import { useAppSelector } from "@/store/store";
import {
  useProject,
  useProjectMembers,
} from "@/features/project/hooks/use-projects";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateTask,
  useProjectTasks,
  useUpdateTask,
  taskKeys,
} from "@/features/project/hooks/use-tasks";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { AvatarStack } from "@/components/projects/avatar-stack";
import BoardView from "@/components/projects/board-view";
import ListView from "@/components/projects/list-view";
import CalendarView from "@/components/projects/calendar-view";
import SummaryView from "@/components/projects/summary-view";
import TaskDetailDrawer from "@/components/projects/task-detail-drawer";
import TaskFormDialog, {
  type TaskFormValues,
} from "@/components/projects/task-form-dialog";
import SprintEditDialog, {
  type SprintFormValues,
} from "@/components/projects/sprint-edit-dialog";
import ProjectMembersPanel from "@/components/projects/project-members-panel";
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Calendar,
  Plus,
  Settings,
  Filter,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Folder,
  LayoutDashboard,
} from "lucide-react";
import { getProjectKey } from "../page";

type ViewMode = "summary" | "board" | "list" | "calendar" | "members";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const { data: project, isLoading, isError } = useProject(projectId);
  const { data: members = [] } = useProjectMembers(projectId);
  const {
    data: serverTasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
  } = useProjectTasks(projectId);
  const createTaskMutation = useCreateTask(projectId);
  const updateTaskMutation = useUpdateTask(projectId);

  const { userId: currentUserId } = useAppSelector((state) => state.auth);

  // States
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingSprint, setEditingSprint] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [newTaskStartDate, setNewTaskStartDate] = useState<string | undefined>();
  const [newTaskAllDay, setNewTaskAllDay] = useState(false);
  const [newTaskParentId, setNewTaskParentId] = useState<string | undefined>();

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
      })),
    [serverTasks, taskStatusOverrides],
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
  const viewTitle: Record<ViewMode, string> = {
    summary: "Summary",
    board: "Kanban Board",
    list: "Backlog",
    calendar: "Calendar",
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

  const handleTaskSubmit = async (values: TaskFormValues) => {
    try {
      if (editingTask) {
        const payload = editingTask.parentTaskId && !values.parentTaskId
          ? { ...values, clearParent: true }
          : values;
        const result = await updateTaskMutation.mutateAsync({
          taskId: editingTask.id,
          payload,
        });
        toast.success("Cập nhật task thành công");
      } else {
        await createTaskMutation.mutateAsync({
          ...values,
        });
        toast.success("Tạo task thành công");
      }

      setShowTaskForm(false);
      setEditingTask(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu task");
    }
  };

  const handleUpdateTaskDirect = async (taskId: string, payload: any) => {
    try {
      // 1. Separate backend allowed keys from payload
      const backendKeys = ["title", "description", "status", "priority", "startDate", "dueDate", "allDay", "estimatedMinutes"];
      const backendPayload: any = {};
      let hasBackendChange = false;
      for (const key of backendKeys) {
        if (key in payload) {
          backendPayload[key] = payload[key];
          hasBackendChange = true;
        }
      }

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

    } catch (error: any) {
      const msg = error?.response?.data?.message || "Không thể cập nhật công việc";
      toast.error(msg);
      console.error("Update task error:", error?.response?.data || error);
    }
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
    } catch (error: any) {
      // Extract backend error message from Axios response
      const backendMessage =
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : "Không thể tạo công việc");
      toast.error(backendMessage);
      console.error("Create task error:", error?.response?.data || error);
    }
  };

  const openCreateTask = (
    status: TaskStatus = TaskStatus.TODO,
    startDate?: string,
    allDay = false,
    parentTaskId?: string,
  ) => {
    setEditingTask(null);
    setNewTaskStatus(status);
    setNewTaskStartDate(startDate);
    setNewTaskAllDay(allDay);
    setNewTaskParentId(parentTaskId);
    setShowTaskForm(true);
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
            <span className="text-[11px] text-slate-500 font-medium">Team-managed software</span>
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
            <span>Backlog</span>
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
            <button className="text-slate-400 hover:text-slate-600">
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
              <SummaryView
                tasks={filteredTasks}
                members={projectWithMembers.members}
              />
            )}
            {!tasksLoading && !tasksError && viewMode === "board" && (
              <BoardView
                tasks={filteredTasks}
                onTaskClick={(task) => setSelectedTask(task)}
                onTaskMove={handleTaskMove}
                onAddTask={openCreateTask}
              />
            )}
            {!tasksLoading && !tasksError && viewMode === "list" && (
              <ListView
                tasks={filteredTasks}
                onTaskClick={(task) => setSelectedTask(task)}
                onAddTask={() => openCreateTask()}
                onAddTaskInline={handleCreateTaskInline}
                onAddSubtask={(task) =>
                  openCreateTask(TaskStatus.TODO, undefined, false, task.id)
                }
                onEditGroup={handleEditGroup}
                onDeleteGroup={handleDeleteGroup}
                onReorderTasks={handleReorderTasks}
              />
            )}
            {!tasksLoading && !tasksError && viewMode === "calendar" && (
              <CalendarView
                tasks={filteredTasks}
                onTaskClick={(task) => setSelectedTask(task)}
                onCreateDate={(date) => openCreateTask(TaskStatus.TODO, date, true)}
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
                onTaskClick={(task) => setSelectedTask(task)}
                onUpdateTask={handleUpdateTaskDirect}
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
            onTaskClick={(task) => setSelectedTask(task)}
            onUpdateTask={handleUpdateTaskDirect}
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

      <TaskFormDialog
        key={`${editingTask?.id ?? "new"}-${newTaskStatus}-${newTaskStartDate ?? ""}-${newTaskAllDay}-${newTaskParentId ?? ""}`}
        open={showTaskForm}
        task={editingTask}
        projectName={project.name}
        parentTasks={tasks}
        initialParentTaskId={newTaskParentId}
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

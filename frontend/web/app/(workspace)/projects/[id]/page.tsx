"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  type Task,
  ProjectType,
  ProjectStatus,
  TaskStatus,
} from "@/features/project/types/project";
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
} from "@/features/project/hooks/use-tasks";
import {
  useProjectLabels,
  useCreateLabel,
  useDeleteLabel,
  useAttachLabel,
  useDetachLabel,
} from "@/features/project/hooks/use-labels";
import {
  useCreateTaskDependency,
  useDeleteTaskDependency,
  useProjectDependencies,
} from "@/features/project/hooks/use-dependencies";
import { ProjectTypeBadge } from "@/features/project/components/shared/project-type-badge";
import ProjectMembersPanel from "@/features/project/components/project/project-members-panel";
import ProjectSidebar from "@/features/project/components/project/project-sidebar";
import ProjectFiltersToolbar from "@/features/project/components/project/project-filters-toolbar";
import ProjectViewContent from "@/features/project/components/project/project-view-content";
import ProjectTaskOverlays, {
  TaskDetailPanel,
} from "@/features/project/components/task/project-task-overlays";
import {
  ArrowLeft,
  Plus,
  Users,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { getProjectKey } from "@/features/project/utils/project.utils";
import { useProjectRealtime } from "@/features/project/hooks/use-project-realtime";
import { useProjectTaskActions } from "@/features/project/hooks/use-project-task-actions";
import { useProjectSprintActions } from "@/features/project/hooks/use-project-sprint-actions";

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
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>(
    TaskStatus.TODO,
  );
  const [newTaskStartDate, setNewTaskStartDate] = useState<
    string | undefined
  >();
  const [newTaskAllDay, setNewTaskAllDay] = useState(false);
  const [newTaskParentId, setNewTaskParentId] = useState<string | undefined>();
  const [newTaskSprintId, setNewTaskSprintId] = useState<string | undefined>();
  const [newTaskIsParentTask, setNewTaskIsParentTask] = useState(false);

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    handleTaskSubmit,
    handleUpdateTaskDirect,
    handleCreateChecklist,
    handleUpdateChecklist,
    handleDeleteChecklist,
  } = useProjectTaskActions({
    projectId,
    members,
    editingTask,
    newTaskSprintId,
    queryClient,
    createTaskMutation,
    updateTaskMutation,
    addTasksToSprintMutation,
    createChecklistMutation,
    updateChecklistMutation,
    deleteChecklistMutation,
    setSelectedTask,
    setShowTaskForm,
    setEditingTask,
  });

  const handleToggleLabel = async (
    taskId: string,
    labelId: string,
    attached: boolean,
  ) => {
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

  const handleCreateDependency = async (
    successorTaskId: string,
    predecessorTaskId: string,
  ) => {
    await createDependencyMutation.mutateAsync({
      successorTaskId,
      predecessorTaskId,
    });
    toast.success("Đã tạo dependency");
  };

  const handleDeleteDependency = async (
    successorTaskId: string,
    predecessorTaskId: string,
  ) => {
    await deleteDependencyMutation.mutateAsync({
      successorTaskId,
      predecessorTaskId,
    });
  };

  const handleCreateLabel = async (payload: {
    name: string;
    color: string;
  }) => {
    try {
      await createLabelMutation.mutateAsync(payload);
      toast.success("Đã tạo label");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo label",
      );
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (
      !window.confirm(
        "Xóa label này khỏi Project? Các task đang dùng label sẽ bị bỏ nhãn.",
      )
    )
      return;
    try {
      await deleteLabelMutation.mutateAsync(labelId);
      toast.success("Đã xóa label");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa label",
      );
    }
  };

  // Filters state
  const [activeAssigneeFilters, setActiveAssigneeFilters] = useState<string[]>(
    [],
  );
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
          displayName:
            members.find((member) => member.userId === assignee.userId)
              ?.displayName || assignee.displayName,
          avatarUrl:
            members.find((member) => member.userId === assignee.userId)
              ?.avatarUrl || assignee.avatarUrl,
        })),
      })),
    [serverTasks, taskStatusOverrides, members],
  );

  // Process filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase());

      // Assignee filter
      let matchesAssignee = true;
      if (activeAssigneeFilters.length > 0) {
        matchesAssignee = t.assignees.some((a) =>
          activeAssigneeFilters.includes(a.userId),
        );
      }

      // "Only my issues" filter
      let matchesMyIssues = true;
      if (onlyMyIssues && currentUserId) {
        matchesMyIssues = t.assignees.some((a) => a.userId === currentUserId);
      }

      return matchesSearch && matchesAssignee && matchesMyIssues;
    });
  }, [tasks, searchQuery, activeAssigneeFilters, onlyMyIssues, currentUserId]);

  const {
    handleEditGroup,
    handleSprintSubmit,
    handleDeleteGroup,
    handleReorderTasks,
    handleCreateTaskInline,
    handleCreateSprintTask,
    openCreateTask,
    handleCreateSprint,
    handleAddTasksToSprint,
    handleBulkUpdateTasks,
    handleUpdateSprint,
    handleStartSprint,
    handleCompleteSprint,
    handleReopenSprint,
    handleRemoveTaskFromSprint,
  } = useProjectSprintActions({
    tasks,
    isSoftwareProject: project?.projectType === ProjectType.SOFTWARE_DEVELOPMENT,
    editingSprint,
    createTaskMutation,
    updateTaskMutation,
    addTasksToSprintMutation,
    createSprintMutation,
    updateSprintMutation,
    startSprintMutation,
    completeSprintMutation,
    reopenSprintMutation,
    removeTaskFromSprintMutation,
    setSelectedTask,
    setEditingSprint,
    setEditingTask,
    setShowTaskForm,
    setNewTaskStatus,
    setNewTaskStartDate,
    setNewTaskAllDay,
    setNewTaskParentId,
    setNewTaskSprintId,
    setNewTaskIsParentTask,
  });


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
          <Inbox className="h-8 w-8 text-slate-400" strokeWidth={1.7} />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-600">
          Không tìm thấy dự án
        </p>
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
  const isSoftwareProject =
    project.projectType === ProjectType.SOFTWARE_DEVELOPMENT;
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

  const handleSaveProjectSettings = async (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
    startDate: string | null;
    dueDate: string | null;
  }) => {
    try {
      await updateProjectMutation.mutateAsync(payload);
      setShowProjectSettings(false);
      toast.success("Đã cập nhật Project");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật Project",
      );
    }
  };

  const handleArchiveProject = async () => {
    if (!window.confirm("Bạn có chắc muốn archive Project này không?")) return;
    try {
      await archiveProjectMutation.mutateAsync();
      window.location.assign("/projects");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể archive Project",
      );
    }
  };


  const toggleAssigneeFilter = (userId: string) => {
    setActiveAssigneeFilters((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const clearAllFilters = () => {
    setActiveAssigneeFilters([]);
    setOnlyMyIssues(false);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* ── Collapsible Project Sidebar (Jira style) ── */}
      <ProjectSidebar
        project={project}
        members={projectWithMembers.members}
        projectKey={projectKey}
        viewMode={viewMode}
        isCollapsed={isSidebarCollapsed}
        onViewModeChange={setViewMode}
        onToggleCollapsed={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
        onOpenSettings={() => setShowProjectSettings(true)}
      />


      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/projects" className="hover:text-blue-600 transition">
            Dự án
          </Link>
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

        <ProjectFiltersToolbar
          projectType={project.projectType}
          members={projectWithMembers.members}
          tasks={tasks}
          searchQuery={searchQuery}
          activeAssigneeFilters={activeAssigneeFilters}
          onlyMyIssues={onlyMyIssues}
          onSearchChange={setSearchQuery}
          onToggleAssignee={toggleAssigneeFilter}
          onToggleOnlyMyIssues={() => setOnlyMyIssues((value) => !value)}
          onClearFilters={clearAllFilters}
        />


        {/* ── Content View ── */}
        <div className="mt-5 flex gap-5 flex-1 min-h-0 overflow-hidden relative">
          <ProjectViewContent
            projectId={projectId}
            projectType={project.projectType}
            viewMode={viewMode}
            tasks={filteredTasks}
            sprints={sprints}
            dependencies={dependencies}
            members={projectWithMembers.members}
            tasksLoading={tasksLoading}
            tasksError={tasksError}
            onTaskClick={setSelectedTask}
            onOpenChat={setChatTask}
            onTaskMove={handleTaskMove}
            onOpenCreateTask={openCreateTask}
            onCreateTaskInline={handleCreateTaskInline}
            onAddSubtask={(task) => openCreateTask(TaskStatus.TODO, undefined, false, task.id)}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
            onReorderTasks={handleReorderTasks}
            onCreateDate={(date) => openCreateTask(TaskStatus.TODO, date, true)}
            onCreateSprintTask={handleCreateSprintTask}
            onCreateSprint={handleCreateSprint}
            onUpdateSprint={handleUpdateSprint}
            onAddTasksToSprint={handleAddTasksToSprint}
            onBulkUpdateTasks={handleBulkUpdateTasks}
            onStartSprint={handleStartSprint}
            onCompleteSprint={handleCompleteSprint}
            onReopenSprint={handleReopenSprint}
            onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
            isSprintBusy={
              createSprintMutation.isPending ||
              addTasksToSprintMutation.isPending ||
              startSprintMutation.isPending ||
              completeSprintMutation.isPending ||
              updateSprintMutation.isPending ||
              reopenSprintMutation.isPending ||
              removeTaskFromSprintMutation.isPending
            }
          />


          {/* Members sidebar (collapsible right panel) */}
          {showMembers && viewMode !== "members" && (
            <div className="hidden w-72 shrink-0 lg:block border-l border-slate-200 pl-4 overflow-y-auto">
              <ProjectMembersPanel
                projectId={projectId}
                members={projectWithMembers.members}
              />
            </div>
          )}

          <TaskDetailPanel
            task={selectedTask}
            tasks={tasks}
            members={projectWithMembers.members}
            project={project}
            labels={labels}
            dependencies={dependencies}
            onClose={() => setSelectedTask(null)}
            onOpenChat={setChatTask}
            onTaskClick={setSelectedTask}
            onUpdateTask={handleUpdateTaskDirect}
            onCreateChecklist={handleCreateChecklist}
            onUpdateChecklist={handleUpdateChecklist}
            onDeleteChecklist={handleDeleteChecklist}
            onToggleLabel={handleToggleLabel}
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
            isInline
          />

        </div>
      </main>

      <ProjectTaskOverlays
        task={selectedTask}
        tasks={tasks}
        members={projectWithMembers.members}
        project={project}
        labels={labels}
        dependencies={dependencies}
        onClose={() => setSelectedTask(null)}
        onOpenChat={setChatTask}
        onTaskClick={setSelectedTask}
        onUpdateTask={handleUpdateTaskDirect}
        onCreateChecklist={handleCreateChecklist}
        onUpdateChecklist={handleUpdateChecklist}
        onDeleteChecklist={handleDeleteChecklist}
        onToggleLabel={handleToggleLabel}
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
        chatTask={chatTask}
        showProjectSettings={showProjectSettings}
        onCloseChat={() => setChatTask(null)}
        onCloseProjectSettings={() => setShowProjectSettings(false)}
        isProjectSettingsBusy={updateProjectMutation.isPending || archiveProjectMutation.isPending}
        onSaveProjectSettings={handleSaveProjectSettings}
        onArchiveProject={handleArchiveProject}
        onCreateLabel={handleCreateLabel}
        onDeleteLabel={handleDeleteLabel}
        showTaskForm={showTaskForm}
        editingTask={editingTask}
        newTaskStatus={newTaskStatus}
        newTaskStartDate={newTaskStartDate}
        newTaskAllDay={newTaskAllDay}
        newTaskParentId={newTaskParentId}
        newTaskIsParentTask={newTaskIsParentTask}
        projectName={project.name}
        onCloseTaskForm={() => {
          setShowTaskForm(false);
          setEditingTask(null);
          setNewTaskStatus(TaskStatus.TODO);
          setNewTaskStartDate(undefined);
          setNewTaskAllDay(false);
          setNewTaskParentId(undefined);
          setNewTaskSprintId(undefined);
          setNewTaskIsParentTask(false);
        }}
        onSubmitTask={handleTaskSubmit}
        isTaskFormSubmitting={createTaskMutation.isPending || updateTaskMutation.isPending}
        editingSprint={editingSprint}
        onCloseSprint={() => setEditingSprint(null)}
        onSubmitSprint={handleSprintSubmit}
        isSprintSubmitting={updateTaskMutation.isPending}
      />
    </div>
  );
}

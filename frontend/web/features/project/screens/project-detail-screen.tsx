"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  type Task,
  ProjectType,
  TaskStatus,
  isTerminalTaskStatus,
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
import {
  useCreateTask,
  useProjectTasks,
  useUpdateTask,
} from "@/features/project/hooks/use-tasks";
import { useProjectLabels } from "@/features/project/hooks/use-labels";
import { useProjectDependencies } from "@/features/project/hooks/use-dependencies";
import ProjectDetailContent from "@/features/project/components/project-detail-content";
import TaskDetailDrawer from "@/features/project/components/task-detail-drawer";
import TaskChatDialog from "@/features/project/components/task-chat-dialog";
import TaskFormDialog from "@/features/project/components/task-form-dialog";
import SprintEditDialog from "@/features/project/components/sprint-edit-dialog";
import ProjectSettingsDialog from "@/features/project/components/project-settings-dialog";
import ProjectDetailSidebar, {
  type ProjectViewMode,
} from "@/features/project/components/project-detail-sidebar";
import ProjectDetailToolbar from "@/features/project/components/project-detail-toolbar";
import {
  ProjectDetailLoading,
  ProjectDetailNotFound,
} from "../components/project-detail-fallback";
import { getProjectKey } from "@/features/project/utils/project.utils";
import {
  getProjectPermissions,
  NO_PROJECT_PERMISSIONS,
} from "@/features/project/project-permissions";
import { useProjectTaskFilters } from "@/features/project/hooks/use-project-task-filters";
import { useProjectTaskFormState } from "@/features/project/hooks/use-project-task-form-state";
import { useProjectResourceActions } from "@/features/project/hooks/use-project-resource-actions";
import { useProjectTaskActions } from "@/features/project/hooks/use-project-task-actions";
import { createProjectSprintActions } from "@/features/project/hooks/use-project-sprint-actions";
import { createProjectSettingsActions } from "@/features/project/project-settings-actions";
import { createProjectGroupActions } from "@/features/project/project-group-actions";

export default function ProjectDetailScreen() {
  const params = useParams();
  const projectId = params.id as string;
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
  const { data: labels = [] } = useProjectLabels(projectId);
  const { data: dependencies = [] } = useProjectDependencies(projectId);
  const createSprintMutation = useCreateSprint(projectId);
  const addTasksToSprintMutation = useAddTasksToSprint(projectId);
  const startSprintMutation = useStartSprint(projectId);
  const completeSprintMutation = useCompleteSprint(projectId);
  const updateSprintMutation = useUpdateSprint(projectId);
  const reopenSprintMutation = useReopenSprint(projectId);
  const removeTaskFromSprintMutation = useRemoveTaskFromSprint(projectId);

  const { userId: currentUserId } = useAppSelector((state) => state.auth);
  const permissions = project
    ? getProjectPermissions(project, members, currentUserId)
    : NO_PROJECT_PERMISSIONS;

  // States
  const [viewMode, setViewMode] = useState<ProjectViewMode>("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [chatTask, setChatTask] = useState<Task | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("view") !== "settings") return;
    const timer = window.setTimeout(() => setShowProjectSettings(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const [editingSprint, setEditingSprint] = useState<Task | null>(null);
  const {
    isOpen: showTaskForm,
    editingTask,
    status: newTaskStatus,
    startDate: newTaskStartDate,
    allDay: newTaskAllDay,
    parentTaskId: newTaskParentId,
    sprintId: newTaskSprintId,
    isParentTask: newTaskIsParentTask,
    open: openCreateTask,
    edit: editTask,
    close: closeTaskForm,
  } = useProjectTaskFormState(
    project?.projectType === ProjectType.SOFTWARE_DEVELOPMENT,
  );

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  function rejectCompletedTaskChange(taskId: string): boolean {
    const target = serverTasks.find((task) => task.id === taskId);
    if (!target) return false;
    if (isTerminalTaskStatus(target.status)) {
      toast.info("Công việc đã kết thúc và chỉ có thể xem");
      return true;
    }
    if (!permissions.canEditTask(target)) {
      toast.info("Bạn không có quyền chỉnh sửa công việc này");
      return true;
    }
    return false;
  }

  const {
    toggleLabel: handleToggleLabel,
    createDependency: handleCreateDependency,
    deleteDependency: handleDeleteDependency,
    createLabel: handleCreateLabel,
    deleteLabel: handleDeleteLabel,
    createChecklist: handleCreateChecklist,
    updateChecklist: handleUpdateChecklist,
    deleteChecklist: handleDeleteChecklist,
  } = useProjectResourceActions({
    projectId,
    labels,
    selectedTask,
    setSelectedTask,
    rejectChange: rejectCompletedTaskChange,
  });

  const {
    tasks,
    filteredTasks,
    searchQuery,
    setSearchQuery,
    assigneeIds: activeAssigneeFilters,
    setAssigneeIds: setActiveAssigneeFilters,
    status: statusFilter,
    setStatus: setStatusFilter,
    priority: priorityFilter,
    setPriority: setPriorityFilter,
    quickAssignee: quickAssigneeFilter,
    setQuickAssignee: setQuickAssigneeFilter,
    kind: taskKindFilter,
    setKind: setTaskKindFilter,
    onlyMyIssues,
    setOnlyMyIssues,
    setStatusOverrides: setTaskStatusOverrides,
    toggleAssignee: toggleAssigneeFilter,
    clear: clearAllFilters,
    isActive: isFiltersActive,
  } = useProjectTaskFilters(serverTasks, members, currentUserId);

  const {
    moveTask: handleTaskMove,
    submitTask: handleTaskSubmit,
    updateTaskDirect: handleUpdateTaskDirect,
  } = useProjectTaskActions({
    projectId,
    tasks,
    members,
    permissions,
    editingTask,
    targetSprintId: newTaskSprintId,
    setSelectedTask,
    setStatusOverrides: setTaskStatusOverrides,
    rejectChange: rejectCompletedTaskChange,
    closeTaskForm,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    addTasksToSprint: addTasksToSprintMutation.mutateAsync,
  });

  if (isLoading) {
    return <ProjectDetailLoading />;
  }

  if (isError || !project) {
    return <ProjectDetailNotFound />;
  }

  const projectKey = getProjectKey(project.name);
  const projectWithMembers = { ...project, members };
  const isSoftwareProject =
    project.projectType === ProjectType.SOFTWARE_DEVELOPMENT;
  const viewTitle: Record<ProjectViewMode, string> = {
    summary: "Summary",
    board: "Kanban Board",
    list: isSoftwareProject ? "Backlog" : "Công việc",
    calendar: "Calendar",
    gantt: "Gantt chart",
    members: "Thành viên dự án",
  };

  const { save: handleSaveProjectSettings, archive: handleArchiveProject } =
    createProjectSettingsActions({
      update: updateProjectMutation.mutateAsync,
      archive: archiveProjectMutation.mutateAsync,
      close: () => setShowProjectSettings(false),
    });

  const {
    editGroup: handleEditGroup,
    submitGroup: handleSprintSubmit,
    deleteGroup: handleDeleteGroup,
    reorderTasks: handleReorderTasks,
    createTaskInline: handleCreateTaskInline,
    createSprintTask: handleCreateSprintTask,
  } = createProjectGroupActions({
    tasks,
    editingGroup: editingSprint,
    setEditingGroup: setEditingSprint,
    setSelectedTask,
    rejectChange: rejectCompletedTaskChange,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    addTasksToSprint: addTasksToSprintMutation.mutateAsync,
  });

  const {
    createSprint: handleCreateSprint,
    addTasks: handleAddTasksToSprint,
    bulkUpdateTasks: handleBulkUpdateTasks,
    updateSprint: handleUpdateSprint,
    startSprint: handleStartSprint,
    completeSprint: handleCompleteSprint,
    reopenSprint: handleReopenSprint,
    removeTask: handleRemoveTaskFromSprint,
  } = createProjectSprintActions({
    createSprint: createSprintMutation.mutateAsync,
    addTasks: addTasksToSprintMutation.mutateAsync,
    updateTasks: (taskId, status) =>
      updateTaskMutation.mutateAsync({ taskId, payload: { status } }),
    updateSprint: updateSprintMutation.mutateAsync,
    startSprint: startSprintMutation.mutateAsync,
    completeSprint: completeSprintMutation.mutateAsync,
    reopenSprint: reopenSprintMutation.mutateAsync,
    removeTask: removeTaskFromSprintMutation.mutateAsync,
  });

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <ProjectDetailSidebar
        project={project}
        members={projectWithMembers.members}
        projectKey={projectKey}
        viewMode={viewMode}
        isCollapsed={isSidebarCollapsed}
        canOpenSettings={
          permissions.canManageProject || permissions.canManageLabels
        }
        onViewChange={setViewMode}
        onToggle={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
        onOpenSettings={() => setShowProjectSettings(true)}
      />

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto px-8 py-6">
        <ProjectDetailToolbar
          project={project}
          members={projectWithMembers.members}
          tasks={tasks}
          viewTitle={viewTitle[viewMode]}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          assigneeFilter={quickAssigneeFilter}
          taskKindFilter={taskKindFilter}
          selectedAssigneeIds={activeAssigneeFilters}
          onlyMyIssues={onlyMyIssues}
          isFiltersActive={isFiltersActive}
          canCreateTask={permissions.canCreateTask}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          onAssigneeChange={(value) => {
            setQuickAssigneeFilter(value);
            setActiveAssigneeFilters([]);
          }}
          onTaskKindChange={setTaskKindFilter}
          onToggleAssignee={toggleAssigneeFilter}
          onToggleOnlyMyIssues={() => setOnlyMyIssues((value) => !value)}
          onClearFilters={clearAllFilters}
          onToggleMembers={() => setShowMembers((visible) => !visible)}
          onCreateTask={() => openCreateTask()}
        />

        <ProjectDetailContent
          project={project}
          projectId={projectId}
          viewMode={viewMode}
          tasks={filteredTasks}
          members={projectWithMembers.members}
          sprints={sprints}
          dependencies={dependencies}
          isSoftwareProject={isSoftwareProject}
          isLoading={tasksLoading}
          isError={tasksError}
          showMembers={showMembers}
          isSprintBusy={
            createSprintMutation.isPending ||
            addTasksToSprintMutation.isPending ||
            startSprintMutation.isPending ||
            completeSprintMutation.isPending ||
            updateSprintMutation.isPending ||
            reopenSprintMutation.isPending ||
            removeTaskFromSprintMutation.isPending
          }
          permissions={permissions}
          openTaskForm={openCreateTask}
          onTaskSelect={setSelectedTask}
          onChatOpen={setChatTask}
          onTaskMove={handleTaskMove}
          onCreateSprintTask={handleCreateSprintTask}
          onCreateSprint={handleCreateSprint}
          onUpdateSprint={handleUpdateSprint}
          onAddTasksToSprint={handleAddTasksToSprint}
          onBulkUpdateTasks={handleBulkUpdateTasks}
          onStartSprint={handleStartSprint}
          onCompleteSprint={handleCompleteSprint}
          onReopenSprint={handleReopenSprint}
          onRemoveTaskFromSprint={handleRemoveTaskFromSprint}
          onCreateTaskInline={handleCreateTaskInline}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroup}
          onReorderTasks={handleReorderTasks}
        />
      </main>

      {/* ── Task detail drawer ── */}
      {selectedTask && (
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
          canEditTask={permissions.canEditTask(selectedTask)}
          onCreateSubtask={
            permissions.canCreateTask
              ? (task) => {
                  if (rejectCompletedTaskChange(task.id)) return;
                  setSelectedTask(null);
                  openCreateTask(TaskStatus.TODO, undefined, false, task.id);
                }
              : undefined
          }
          onEdit={
            permissions.canEditTask(selectedTask)
              ? (task) => {
                  if (rejectCompletedTaskChange(task.id)) return;
                  setSelectedTask(null);
                  editTask(task);
                }
              : undefined
          }
        />
      )}

      <TaskChatDialog task={chatTask} onClose={() => setChatTask(null)} />

      {(permissions.canManageProject || permissions.canManageLabels) && (
        <ProjectSettingsDialog
          project={project}
          open={showProjectSettings}
          isBusy={
            updateProjectMutation.isPending || archiveProjectMutation.isPending
          }
          onClose={() => setShowProjectSettings(false)}
          onSave={handleSaveProjectSettings}
          onArchive={handleArchiveProject}
          canEditProject={permissions.canManageProject}
          labels={labels}
          onCreateLabel={
            permissions.canManageLabels ? handleCreateLabel : undefined
          }
          onDeleteLabel={
            permissions.canManageLabels ? handleDeleteLabel : undefined
          }
        />
      )}

      <TaskFormDialog
        key={`${showTaskForm}-${editingTask?.id ?? "new"}-${newTaskStatus}-${newTaskStartDate ?? ""}-${newTaskAllDay}-${newTaskParentId ?? ""}-${newTaskIsParentTask}`}
        open={showTaskForm}
        task={editingTask}
        projectName={project.name}
        parentTasks={tasks}
        initialParentTaskId={newTaskParentId}
        initialIsParentTask={newTaskIsParentTask}
        initialStatus={newTaskStatus}
        initialStartDate={newTaskStartDate}
        initialAllDay={newTaskAllDay}
        onClose={closeTaskForm}
        onSubmit={handleTaskSubmit}
        isSubmitting={
          createTaskMutation.isPending || updateTaskMutation.isPending
        }
      />

      <SprintEditDialog
        key={editingSprint?.id ?? "closed-sprint-editor"}
        open={Boolean(editingSprint)}
        sprint={editingSprint}
        onClose={() => setEditingSprint(null)}
        onSubmit={handleSprintSubmit}
        isSubmitting={updateTaskMutation.isPending}
      />
    </div>
  );
}

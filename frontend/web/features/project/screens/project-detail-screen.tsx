"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  type Task,
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
  useCreateTask,
  useProjectTasks,
  useUpdateTask,
} from "@/features/project/hooks/use-tasks";
import { useProjectLabels } from "@/features/project/hooks/use-labels";
import { useProjectDependencies } from "@/features/project/hooks/use-dependencies";
import ProjectDetailContent from "@/features/project/components/layout/project-detail-content";
import ProjectDetailSidebar, {
  type ProjectViewMode,
} from "@/features/project/components/layout/project-detail-sidebar";
import ProjectDetailToolbar from "@/features/project/components/layout/project-detail-toolbar";
import {
  ProjectDetailLoading,
  ProjectDetailNotFound,
} from "@/features/project/components/layout/project-detail-fallback";
import TaskDetailDrawer from "@/features/project/components/task-detail/task-detail-drawer";
import TaskChatDialog from "@/features/project/components/dialogs/task-chat-dialog";
import TaskFormDialog from "@/features/project/components/dialogs/task-form-dialog";
import InviteMemberDialog from "@/features/project/components/dialogs/invite-member-dialog";
import ProjectSettingsDialog from "@/features/project/components/dialogs/project-settings-dialog";
import {
  getProjectPermissions,
  NO_PROJECT_PERMISSIONS,
} from "@/features/project/project-permissions";
import { useProjectTaskFilters } from "@/features/project/hooks/use-project-task-filters";
import { useProjectTaskFormState } from "@/features/project/hooks/use-project-task-form-state";
import { useProjectResourceActions } from "@/features/project/hooks/use-project-resource-actions";
import { useProjectTaskActions } from "@/features/project/hooks/use-project-task-actions";
import { createProjectSettingsActions } from "@/features/project/project-settings-actions";
import { usePendingProjectInvitations } from "@/features/project/hooks/use-invitations";
import { useProjectSidebarState } from "@/features/project/hooks/use-project-sidebar-state";
import { projectSocketService } from "../api/project-socket.service";

export default function ProjectDetailScreen() {
  const params = useParams();
  const projectId = params.id as string;
  const { data: project, isLoading, isError } = useProject(projectId);
  const { data: members = [] } = useProjectMembers(projectId);
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

  useEffect(() => {
    if (!projectId) return;
    projectSocketService.joinProject(projectId);
    return () => {
      projectSocketService.leaveProject(projectId);
    };
  }, [projectId]);
  const { data: dependencies = [] } = useProjectDependencies(projectId);

  const { userId: currentUserId } = useAppSelector((state) => state.auth);
  const permissions = project
    ? getProjectPermissions(project, members, currentUserId)
    : NO_PROJECT_PERMISSIONS;
  const pendingInvitationsQuery = usePendingProjectInvitations(
    projectId,
    permissions.canInviteMembers,
  );

  // States
  const [viewMode, setViewMode] = useState<ProjectViewMode>("board");
  const [selectedTaskSnapshot, setSelectedTask] = useState<Task | null>(null);
  const selectedTask = selectedTaskSnapshot
    ? (serverTasks.find((task) => task.id === selectedTaskSnapshot.id) ??
      selectedTaskSnapshot)
    : null;
  const [chatTask, setChatTask] = useState<Task | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("view") !== "settings") return;
    const timer = window.setTimeout(() => setShowProjectSettings(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const {
    isOpen: showTaskForm,
    editingTask,
    status: newTaskStatus,
    startDate: newTaskStartDate,
    allDay: newTaskAllDay,
    parentTaskId: newTaskParentId,
    open: openCreateTask,
    edit: editTask,
    close: closeTaskForm,
  } = useProjectTaskFormState();

  // Sidebar state
  const {
    isCollapsed: isSidebarCollapsed,
    isMobileOpen: isMobileSidebarOpen,
    toggleCollapsed: handleSidebarToggle,
    openMobile: openMobileSidebar,
    closeMobile: closeMobileSidebar,
  } = useProjectSidebarState();

  const handleSidebarViewChange = (view: ProjectViewMode) => {
    setViewMode(view);
    closeMobileSidebar();
  };

  const handleSidebarInvite = () => {
    closeMobileSidebar();
    setShowInviteDialog(true);
  };

  const handleSidebarSettings = () => {
    closeMobileSidebar();
    setShowProjectSettings(true);
  };

  function rejectCompletedTaskChange(taskId: string): boolean {
    const target = serverTasks.find((task) => task.id === taskId);
    if (!target) return false;
    if (isTerminalTaskStatus(target.status)) {
      toast.info("This task is completed or cancelled and cannot be modified.");
      return true;
    }
    if (!permissions.canEditTask(target)) {
      toast.info("You do not have permission to edit this task.");
      return true;
    }
    return false;
  }

  function rejectTerminalTaskChange(taskId: string): boolean {
    const target = serverTasks.find((task) => task.id === taskId);
    if (!target || !isTerminalTaskStatus(target.status)) return false;
    toast.info("This task is completed or cancelled and cannot be modified.");
    return true;
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
    rejectChecklistChange: rejectTerminalTaskChange,
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
    setSelectedTask,
    setStatusOverrides: setTaskStatusOverrides,
    rejectChange: rejectCompletedTaskChange,
    closeTaskForm,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
  });

  const handleTaskReschedule = async (
    taskId: string,
    targetDateKey: string,
  ) => {
    const task = serverTasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.startDate || task.dueDate) return;
    if (rejectCompletedTaskChange(taskId)) return;
    if (!targetDateKey || targetDateKey === "unscheduled") return;

    try {
      await handleUpdateTaskDirect(taskId, {
        startDate: `${targetDateKey}T00:00:00.000Z`,
        dueDate: `${targetDateKey}T00:00:00.000Z`,
        allDay: true,
      });
      toast.success("Task updated successfully");
    } catch {
      // Error toast handled by updateTaskDirect
    }
  };

  const handleCreateTaskInline = async (title: string, parentTaskId?: string) => {
    try {
      await createTaskMutation.mutateAsync({
        title: title.trim(),
        ...(parentTaskId ? { parentTaskId } : {}),
      });
      toast.success("Task created successfully");
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message ||
          "Failed to create task",
      );
    }
  };

  if (isLoading) {
    return <ProjectDetailLoading />;
  }

  if (isError || !project) {
    return <ProjectDetailNotFound />;
  }

  const projectWithMembers = { ...project, members };
  const viewTitle: Record<ProjectViewMode, string> = {
    summary: "Summary",
    board: "Board",
    list: "Tasks",
    calendar: "Calendar",
    gantt: "Timeline",
    members: "Members",
  };

  const { save: handleSaveProjectSettings, archive: handleArchiveProject } =
    createProjectSettingsActions({
      update: updateProjectMutation.mutateAsync,
      archive: archiveProjectMutation.mutateAsync,
      close: () => setShowProjectSettings(false),
    });

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <ProjectDetailSidebar
        project={project}
        members={projectWithMembers.members}
        viewMode={viewMode}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        canOpenSettings={
          permissions.canManageProject || permissions.canManageLabels
        }
        canInviteMembers={permissions.canInviteMembers}
        onInviteMembers={handleSidebarInvite}
        onViewChange={handleSidebarViewChange}
        onToggle={handleSidebarToggle}
        onMobileClose={closeMobileSidebar}
        onOpenSettings={handleSidebarSettings}
      />

      {/* ── Main Content Area ── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-white px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <ProjectDetailToolbar
          project={project}
          members={projectWithMembers.members}
          tasks={tasks}
          viewTitle={viewTitle[viewMode]}
          viewMode={viewMode}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          assigneeFilter={quickAssigneeFilter}
          selectedAssigneeIds={activeAssigneeFilters}
          onlyMyIssues={onlyMyIssues}
          isFiltersActive={isFiltersActive}
          canCreateTask={permissions.canCreateTask}
          canInviteMembers={permissions.canInviteMembers}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          onAssigneeChange={(value) => {
            setQuickAssigneeFilter(value);
            setActiveAssigneeFilters([]);
          }}
          onToggleAssignee={toggleAssigneeFilter}
          onToggleOnlyMyIssues={() => setOnlyMyIssues((value) => !value)}
          onClearFilters={clearAllFilters}
          onToggleMembers={() => setShowMembers((visible) => !visible)}
          onOpenProjectNavigation={openMobileSidebar}
          onCreateTask={() => openCreateTask()}
          onInviteMembers={() => setShowInviteDialog(true)}
        />

        <ProjectDetailContent
          project={project}
          projectId={projectId}
          viewMode={viewMode}
          tasks={filteredTasks}
          members={projectWithMembers.members}
          dependencies={dependencies}
          isLoading={tasksLoading}
          isError={tasksError}
          showMembers={showMembers}
          permissions={permissions}
          openTaskForm={openCreateTask}
          onTaskSelect={setSelectedTask}
          onChatOpen={setChatTask}
          onTaskMove={handleTaskMove}
          onCreateTaskInline={handleCreateTaskInline}
          onViewChange={setViewMode}
          onTaskReschedule={handleTaskReschedule}
        />
      </main>

      {/* ── Task detail drawer ── */}
      {selectedTask && (
        <TaskDetailDrawer
          key={selectedTask.id}
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
          canContributeTask={permissions.canContributeTask(selectedTask)}
          canComment={Boolean(permissions.role)}
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

      <TaskChatDialog
        key={chatTask?.id ?? "closed"}
        task={chatTask}
        members={members}
        canComment={Boolean(permissions.role)}
        onClose={() => setChatTask(null)}
      />

      {permissions.canInviteMembers && (
        <InviteMemberDialog
          key={
            showInviteDialog ? "sidebar-invite-open" : "sidebar-invite-closed"
          }
          open={showInviteDialog}
          projectId={projectId}
          members={projectWithMembers.members}
          pendingInvitations={pendingInvitationsQuery.data ?? []}
          onClose={() => setShowInviteDialog(false)}
        />
      )}

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
        key={`${showTaskForm}-${editingTask?.id ?? "new"}-${newTaskStatus}-${newTaskStartDate ?? ""}-${newTaskAllDay}-${newTaskParentId ?? ""}`}
        open={showTaskForm}
        task={editingTask}
        projectName={project.name}
        parentTasks={tasks}
        initialParentTaskId={newTaskParentId}
        initialStatus={newTaskStatus}
        initialStartDate={newTaskStartDate}
        initialAllDay={newTaskAllDay}
        onClose={closeTaskForm}
        onSubmit={handleTaskSubmit}
        isSubmitting={
          createTaskMutation.isPending || updateTaskMutation.isPending
        }
      />
    </div>
  );
}

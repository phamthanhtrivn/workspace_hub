"use client";

import type { UpdateTaskPayload } from "@/features/project/api/task.api";
import type {
  Project,
  ProjectMember,
  Task,
  TaskChecklist,
  TaskDependency,
  TaskLabel,
} from "@/features/project/types/project";
import { TaskStatus } from "@/features/project/types/project";
import TaskChatDialog from "./task-chat-dialog";
import TaskDetailDrawer from "./task-detail-drawer";
import TaskFormDialog, { type TaskFormValues } from "./task-form-dialog";
import ProjectSettingsDialog from "./project-settings-dialog";
import SprintEditDialog, { type SprintFormValues } from "./sprint-edit-dialog";

export type TaskDrawerUpdatePayload = UpdateTaskPayload & {
  assignees?: Task["assignees"];
  assigneeUserId?: string | null;
};

interface TaskDrawerProps {
  task: Task | null;
  tasks: Task[];
  members: ProjectMember[];
  project: Project;
  labels: TaskLabel[];
  dependencies: TaskDependency[];
  onClose: () => void;
  onOpenChat: (task: Task) => void;
  onTaskClick: (task: Task) => void;
  onUpdateTask: (taskId: string, payload: TaskDrawerUpdatePayload) => Promise<void>;
  onCreateChecklist: (taskId: string, title: string) => Promise<TaskChecklist>;
  onUpdateChecklist: (checklistId: string, completed: boolean) => Promise<TaskChecklist>;
  onDeleteChecklist: (checklistId: string) => Promise<void>;
  onToggleLabel: (taskId: string, labelId: string, attached: boolean) => Promise<void>;
  onCreateDependency: (successorTaskId: string, predecessorTaskId: string) => Promise<void>;
  onDeleteDependency: (successorTaskId: string, predecessorTaskId: string) => Promise<void>;
  onCreateSubtask: (task: Task) => void;
  onEdit: (task: Task) => void;
  isInline?: boolean;
}

function TaskDetailPanel(props: TaskDrawerProps) {
  if (!props.task) return null;

  return (
    <div className="hidden lg:flex w-[400px] xl:w-[450px] shrink-0 border border-slate-200 rounded bg-white flex-col h-full overflow-hidden shadow-sm animate-in slide-in-from-right duration-200">
      <TaskDetailDrawer {...props} isInline />
    </div>
  );
}

interface ProjectTaskOverlaysProps extends TaskDrawerProps {
  chatTask: Task | null;
  showProjectSettings: boolean;
  onCloseChat: () => void;
  onCloseProjectSettings: () => void;
  isProjectSettingsBusy: boolean;
  onSaveProjectSettings: (payload: {
    name: string;
    description: string;
    status: Project["status"];
    startDate: string | null;
    dueDate: string | null;
  }) => Promise<void>;
  onArchiveProject: () => Promise<void>;
  onCreateLabel: (payload: { name: string; color: string }) => Promise<void>;
  onDeleteLabel: (labelId: string) => Promise<void>;
  showTaskForm: boolean;
  editingTask: Task | null;
  newTaskStatus: TaskStatus;
  newTaskStartDate?: string;
  newTaskAllDay: boolean;
  newTaskParentId?: string;
  newTaskIsParentTask: boolean;
  projectName: string;
  onCloseTaskForm: () => void;
  onSubmitTask: (values: TaskFormValues) => Promise<void>;
  isTaskFormSubmitting: boolean;
  editingSprint: Task | null;
  onCloseSprint: () => void;
  onSubmitSprint: (values: SprintFormValues) => Promise<void>;
  isSprintSubmitting: boolean;
}

export { TaskDetailPanel };

export default function ProjectTaskOverlays({
  task,
  tasks,
  members,
  project,
  labels,
  dependencies,
  onClose,
  onOpenChat,
  onTaskClick,
  onUpdateTask,
  onCreateChecklist,
  onUpdateChecklist,
  onDeleteChecklist,
  onToggleLabel,
  onCreateDependency,
  onDeleteDependency,
  onCreateSubtask,
  onEdit,
  chatTask,
  showProjectSettings,
  onCloseChat,
  onCloseProjectSettings,
  isProjectSettingsBusy,
  onSaveProjectSettings,
  onArchiveProject,
  onCreateLabel,
  onDeleteLabel,
  showTaskForm,
  editingTask,
  newTaskStatus,
  newTaskStartDate,
  newTaskAllDay,
  newTaskParentId,
  newTaskIsParentTask,
  projectName,
  onCloseTaskForm,
  onSubmitTask,
  isTaskFormSubmitting,
  editingSprint,
  onCloseSprint,
  onSubmitSprint,
  isSprintSubmitting,
}: ProjectTaskOverlaysProps) {
  return (
    <>
      {task && (
        <div className="lg:hidden">
          <TaskDetailDrawer
            task={task}
            tasks={tasks}
            members={members}
            project={project}
            onClose={onClose}
            onOpenChat={onOpenChat}
            onTaskClick={onTaskClick}
            onUpdateTask={onUpdateTask}
            onCreateChecklist={onCreateChecklist}
            onUpdateChecklist={onUpdateChecklist}
            onDeleteChecklist={onDeleteChecklist}
            labels={labels}
            onToggleLabel={onToggleLabel}
            dependencies={dependencies}
            onCreateDependency={onCreateDependency}
            onDeleteDependency={onDeleteDependency}
            onCreateSubtask={onCreateSubtask}
            onEdit={onEdit}
            isInline={false}
          />
        </div>
      )}

      <TaskChatDialog task={chatTask} onClose={onCloseChat} />
      <ProjectSettingsDialog
        project={project}
        open={showProjectSettings}
        isBusy={isProjectSettingsBusy}
        onClose={onCloseProjectSettings}
        onSave={onSaveProjectSettings}
        onArchive={onArchiveProject}
        labels={labels}
        onCreateLabel={onCreateLabel}
        onDeleteLabel={onDeleteLabel}
      />
      <TaskFormDialog
        key={`${editingTask?.id ?? "new"}-${newTaskStatus}-${newTaskStartDate ?? ""}-${newTaskAllDay}-${newTaskParentId ?? ""}-${newTaskIsParentTask}`}
        open={showTaskForm}
        task={editingTask}
        projectName={projectName}
        parentTasks={tasks}
        initialParentTaskId={newTaskParentId}
        initialIsParentTask={newTaskIsParentTask}
        initialStatus={newTaskStatus}
        initialStartDate={newTaskStartDate}
        initialAllDay={newTaskAllDay}
        onClose={onCloseTaskForm}
        onSubmit={onSubmitTask}
        isSubmitting={isTaskFormSubmitting}
      />
      <SprintEditDialog
        open={Boolean(editingSprint)}
        sprint={editingSprint}
        onClose={onCloseSprint}
        onSubmit={onSubmitSprint}
        isSubmitting={isSprintSubmitting}
      />
    </>
  );
}

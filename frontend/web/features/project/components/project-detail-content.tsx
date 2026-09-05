import BoardView from "./board-view";
import { useAppSelector } from "@/store/store";
import CalendarView from "./calendar-view";
import GanttView from "./gantt-view";
import GeneralSummaryView from "./general-summary-view";
import ListView from "./list-view";
import ProjectMembersPanel from "./project-members-panel";
import SoftwareBacklogView, {
  type SprintCreateValues,
} from "./software-backlog-view";
import SummaryView from "./summary-view";
import type { ProjectPermissions } from "../project-permissions";
import type { ProjectViewMode } from "./project-detail-sidebar";
import {
  TaskStatus,
  type Project,
  type ProjectMember,
  type Sprint,
  type Task,
  type TaskDependency,
} from "../types/project";

export type OpenProjectTaskForm = (
  status?: TaskStatus,
  startDate?: string,
  allDay?: boolean,
  parentTaskId?: string,
  sprintId?: string,
) => void;

interface ProjectDetailContentProps {
  project: Project;
  projectId: string;
  viewMode: ProjectViewMode;
  tasks: Task[];
  members: ProjectMember[];
  sprints: Sprint[];
  dependencies: TaskDependency[];
  isSoftwareProject: boolean;
  isLoading: boolean;
  isError: boolean;
  showMembers: boolean;
  isSprintBusy: boolean;
  permissions: ProjectPermissions;
  openTaskForm: OpenProjectTaskForm;
  onTaskSelect: (task: Task) => void;
  onChatOpen: (task: Task) => void;
  onTaskMove: (taskId: string, status: TaskStatus) => Promise<void>;
  onCreateSprintTask: (sprintId: string, title: string) => Promise<void>;
  onCreateSprint: (values: SprintCreateValues) => Promise<void>;
  onUpdateSprint: (
    sprintId: string,
    values: SprintCreateValues,
  ) => Promise<void>;
  onAddTasksToSprint: (sprintId: string, taskIds: string[]) => Promise<void>;
  onBulkUpdateTasks: (taskIds: string[], status: TaskStatus) => Promise<void>;
  onStartSprint: (sprintId: string) => Promise<void>;
  onCompleteSprint: (sprintId: string) => Promise<void>;
  onReopenSprint: (sprintId: string) => Promise<void>;
  onRemoveTaskFromSprint: (sprintId: string, taskId: string) => Promise<void>;
  onCreateTaskInline: (title: string, parentTaskId?: string) => Promise<void>;
  onEditGroup: (task: Task) => void;
  onDeleteGroup: (task: Task) => Promise<void>;
  onReorderTasks: (group: Task, orderedTasks: Task[]) => Promise<void>;
}

export default function ProjectDetailContent(props: ProjectDetailContentProps) {
  const { userId } = useAppSelector((state) => state.auth);
  const { permissions } = props;
  const memberPanel = (
    <ProjectMembersPanel
      projectId={props.projectId}
      members={props.members}
      canInvite={permissions.canInviteMembers}
      canRemoveMembers={permissions.canManageMembers}
      canManagePermissions={permissions.canManagePermissions}
    />
  );

  const renderView = () => {
    if (props.isLoading)
      return (
        <div className="rounded border border-slate-200 bg-white py-24 text-center text-sm font-semibold text-slate-400">
          Đang tải công việc...
        </div>
      );
    if (props.isError)
      return (
        <div className="rounded border border-red-100 bg-red-50 py-24 text-center text-sm font-semibold text-red-500">
          Không thể tải danh sách công việc. Vui lòng kiểm tra lại dịch vụ
          backend.
        </div>
      );

    if (props.viewMode === "summary") {
      return props.isSoftwareProject ? (
        <SummaryView
          tasks={props.tasks}
          members={props.members}
          sprints={props.sprints}
        />
      ) : (
        <GeneralSummaryView tasks={props.tasks} members={props.members} />
      );
    }
    if (props.viewMode === "board") {
      return (
        <BoardView
          tasks={props.tasks}
          onTaskClick={props.onTaskSelect}
          onOpenChat={props.onChatOpen}
          onTaskMove={props.onTaskMove}
          onAddTask={permissions.canCreateTask ? props.openTaskForm : undefined}
          canEditTask={permissions.canEditTask}
        />
      );
    }
    if (props.viewMode === "list" && props.isSoftwareProject) {
      return (
        <SoftwareBacklogView
          projectId={props.projectId}
          ownerId={props.project.ownerId}
          currentUserId={userId}
          canContribute={Boolean(permissions.role)}
          tasks={props.tasks}
          sprints={props.sprints}
          onTaskClick={props.onTaskSelect}
          onOpenChat={props.onChatOpen}
          onCreateTask={(sprintId) =>
            props.openTaskForm(
              TaskStatus.TODO,
              undefined,
              false,
              undefined,
              sprintId,
            )
          }
          onCreateSprintTask={props.onCreateSprintTask}
          onCreateSprint={props.onCreateSprint}
          onUpdateSprint={props.onUpdateSprint}
          onAddTasksToSprint={props.onAddTasksToSprint}
          onBulkUpdateTasks={props.onBulkUpdateTasks}
          onStartSprint={props.onStartSprint}
          onCompleteSprint={props.onCompleteSprint}
          onReopenSprint={props.onReopenSprint}
          onRemoveTaskFromSprint={props.onRemoveTaskFromSprint}
          isBusy={props.isSprintBusy}
          canCreateTask={permissions.canCreateTask}
          canManageSprints={permissions.canManageSprints}
          canEditTask={permissions.canEditTask}
        />
      );
    }
    if (props.viewMode === "list") {
      return (
        <ListView
          tasks={props.tasks}
          projectType={props.project.projectType}
          onTaskClick={props.onTaskSelect}
          onOpenChat={props.onChatOpen}
          onAddTask={() => props.openTaskForm()}
          onAddTaskInline={
            permissions.canCreateTask ? props.onCreateTaskInline : undefined
          }
          onAddSubtask={(task) =>
            props.openTaskForm(TaskStatus.TODO, undefined, false, task.id)
          }
          onEditGroup={
            permissions.canManageProject ? props.onEditGroup : undefined
          }
          onDeleteGroup={
            permissions.canManageProject ? props.onDeleteGroup : undefined
          }
          onReorderTasks={
            permissions.canManageProject ? props.onReorderTasks : undefined
          }
        />
      );
    }
    if (props.viewMode === "calendar") {
      return (
        <CalendarView
          tasks={props.tasks}
          onTaskClick={props.onTaskSelect}
          onCreateDate={
            permissions.canCreateTask
              ? (date) => props.openTaskForm(TaskStatus.TODO, date, true)
              : undefined
          }
        />
      );
    }
    if (props.viewMode === "gantt") {
      return (
        <GanttView
          tasks={props.tasks}
          dependencies={props.dependencies}
          onTaskClick={props.onTaskSelect}
        />
      );
    }
    return <div className="max-w-3xl">{memberPanel}</div>;
  };

  return (
    <div className="relative mt-5 flex min-h-0 flex-1 gap-5 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto pr-1">{renderView()}</div>
      {props.showMembers && props.viewMode !== "members" && (
        <div className="hidden w-72 shrink-0 overflow-y-auto border-l border-slate-200 pl-4 lg:block">
          {memberPanel}
        </div>
      )}
    </div>
  );
}

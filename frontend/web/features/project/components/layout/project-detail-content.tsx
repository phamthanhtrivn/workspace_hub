import BoardView from "../views/board-view";
import { useAppSelector } from "@/store/store";
import CalendarView from "../views/calendar-view";
import GanttView from "../views/gantt-view";
import ListView from "../views/list-view";
import ProjectMembersPanel from "../members/project-members-panel";
import ProjectMembersView from "../views/project-members-view";
import SummaryView from "../views/summary-view";
import type { ProjectPermissions } from "@/features/project/project-permissions";
import type { ProjectViewMode } from "./project-detail-sidebar";
import {
  isTerminalTaskStatus,
  TaskStatus,
  type Project,
  type ProjectMember,
  type Task,
  type TaskDependency,
} from "@/features/project/types/project";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export type OpenProjectTaskForm = (
  status?: TaskStatus,
  startDate?: string,
  allDay?: boolean,
  parentTaskId?: string,
) => void;

interface ProjectDetailContentProps {
  project: Project;
  projectId: string;
  viewMode: ProjectViewMode;
  tasks: Task[];
  members: ProjectMember[];
  dependencies: TaskDependency[];
  isLoading: boolean;
  isError: boolean;
  showMembers: boolean;
  permissions: ProjectPermissions;
  openTaskForm: OpenProjectTaskForm;
  onTaskSelect: (task: Task) => void;
  onChatOpen: (task: Task) => void;
  onTaskMove: (taskId: string, status: TaskStatus) => Promise<void>;
  onCreateTaskInline: (title: string, parentTaskId?: string) => Promise<void>;
  onViewChange?: (view: ProjectViewMode) => void;
  onTaskReschedule?: (taskId: string, targetDateKey: string) => Promise<void>;
}

export default function ProjectDetailContent(props: ProjectDetailContentProps) {
  const intl = useAppIntl();
  const { userId } = useAppSelector((state) => state.auth);
  const { permissions } = props;
  const memberPanel = (
    <ProjectMembersPanel
      projectId={props.projectId}
      members={props.members}
      canInvite={permissions.canInviteMembers}
      canRemoveMembers={permissions.canManageMembers}
      canManagePermissions={permissions.canManagePermissions}
      onViewAll={
        props.onViewChange ? () => props.onViewChange?.("members") : undefined
      }
    />
  );

  const renderView = () => {
    if (props.isLoading)
      return (
        <div className="rounded border border-slate-200 bg-white py-24 text-center text-sm font-semibold text-slate-400">
          {intl.formatMessage({ id: "project.task.loading" })}
        </div>
      );
    if (props.isError)
      return (
        <div className="rounded border border-red-100 bg-red-50 py-24 text-center text-sm font-semibold text-red-500">
          {intl.formatMessage({ id: "project.task.loadFailed" })}
        </div>
      );

    if (props.viewMode === "summary") {
      return (
        <SummaryView tasks={props.tasks} members={props.members} />
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
          canMoveTask={permissions.canContributeTask}
        />
      );
    }
    if (props.viewMode === "list") {
      return (
        <ListView
          tasks={props.tasks}
          onTaskClick={props.onTaskSelect}
          onOpenChat={props.onChatOpen}
          onAddTask={
            permissions.canCreateTask ? () => props.openTaskForm() : undefined
          }
          onAddTaskInline={
            permissions.canCreateTask ? props.onCreateTaskInline : undefined
          }
          onAddSubtask={
            permissions.canCreateTask
              ? (task) =>
                  props.openTaskForm(TaskStatus.TODO, undefined, false, task.id)
              : undefined
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
          onTaskReschedule={props.onTaskReschedule}
          canEditTask={(task) =>
            !isTerminalTaskStatus(task.status) &&
            (permissions.canEditTask(task) ||
              permissions.canContributeTask(task))
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
          onTaskReschedule={props.onTaskReschedule}
          canEditTask={(task) =>
            !isTerminalTaskStatus(task.status) &&
            (permissions.canEditTask(task) ||
              permissions.canContributeTask(task))
          }
        />
      );
    }
    if (props.viewMode === "members") {
      return (
        <ProjectMembersView
          projectId={props.projectId}
          members={props.members}
          tasks={props.tasks}
          canInvite={permissions.canInviteMembers}
          canRemoveMembers={permissions.canManageMembers}
          canManagePermissions={permissions.canManagePermissions}
          currentUserId={userId ?? undefined}
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

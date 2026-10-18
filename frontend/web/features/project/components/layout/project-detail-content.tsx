import BoardView from "../views/board-view";
import { useAppSelector } from "@/store/store";
import CalendarView from "../views/calendar-view";
import GanttView from "../views/gantt-view";
import ListView from "../views/list-view";
import ProjectMembersPanel from "../members/project-members-panel";
import ProjectMembersView from "../views/project-members-view";
import ProjectDocumentsView from "../views/project-documents-view";
import SummaryView from "../views/summary-view";
import type { ProjectPermissions } from "@/features/project/project-permissions";
import type { ProjectViewMode } from "./project-detail-sidebar";
import {
  isTerminalTaskStatus,
  TaskPriority,
  TaskStatus,
  type Project,
  type ProjectMember,
  type Task,
  type TaskDependency,
} from "@/features/project/types/project";

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
  onTaskPriorityChange: (taskId: string, priority: TaskPriority) => Promise<void>;
  onCreateTaskInline: (title: string, parentTaskId?: string) => Promise<void>;
  onViewChange?: (view: ProjectViewMode) => void;
  onTaskReschedule?: (taskId: string, targetDateKey: string) => Promise<void>;
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
      onViewAll={
        props.onViewChange ? () => props.onViewChange?.("members") : undefined
      }
    />
  );

  const renderView = () => {
    if (props.viewMode === "documents") {
      return (
        <ProjectDocumentsView
          projectId={props.projectId}
          projectName={props.project.name}
          canEditDocuments={permissions.canEditDocuments}
        />
      );
    }

    if (props.isLoading)
      return (
        <div className="rounded-panel border border-border bg-card py-24 text-center text-sm font-semibold text-muted-foreground">
          Loading tasks...
        </div>
      );
    if (props.isError)
      return (
        <div className="rounded-panel border border-border bg-destructive-soft py-24 text-center text-sm font-semibold text-destructive-content">
          Failed to load tasks. Please try refreshing the page.
        </div>
      );

    if (props.viewMode === "overview") {
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
          onTaskPriorityChange={props.onTaskPriorityChange}
          onAddTask={permissions.canCreateTask ? props.openTaskForm : undefined}
          canMoveTask={permissions.canContributeTask}
          canEditTask={permissions.canEditTask}
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
    <div className="relative mt-4 flex min-h-60 min-w-0 flex-1 shrink-0 gap-4">
      <div
        className={
          props.viewMode === "board" ||
          props.viewMode === "list" ||
          props.viewMode === "calendar" ||
          props.viewMode === "gantt" ||
          props.viewMode === "documents"
            ? "min-h-0 min-w-0 flex-1 overflow-hidden"
            : "min-h-0 min-w-0 flex-1 overflow-y-auto"
        }
      >
        {renderView()}
      </div>
      {props.showMembers && props.viewMode !== "members" && (
        <div className="hidden min-h-0 w-60 shrink-0 overflow-y-auto border-l border-border pl-4 @min-[1200px]/project-detail:block">
          {memberPanel}
        </div>
      )}
    </div>
  );
}

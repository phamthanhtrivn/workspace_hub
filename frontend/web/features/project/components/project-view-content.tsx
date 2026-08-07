"use client";

import {
  ProjectType,
  TaskStatus,
  type ProjectMember,
  type Sprint,
  type Task,
  type TaskDependency,
} from "@/features/project/types/project";
import BoardView from "./board-view";
import CalendarView from "./calendar-view";
import GanttView from "./gantt-view";
import GeneralSummaryView from "./general-summary-view";
import ListView from "./list-view";
import ProjectMembersPanel from "./project-members-panel";
import SoftwareBacklogView, { type SprintCreateValues } from "./software-backlog-view";
import SummaryView from "./summary-view";
import { type ProjectViewMode } from "./project-sidebar";

interface ProjectViewContentProps {
  projectId: string;
  projectType: ProjectType;
  viewMode: ProjectViewMode;
  tasks: Task[];
  sprints: Sprint[];
  dependencies: TaskDependency[];
  members: ProjectMember[];
  tasksLoading: boolean;
  tasksError: boolean;
  onTaskClick: (task: Task) => void;
  onOpenChat: (task: Task) => void;
  onTaskMove: (taskId: string, status: TaskStatus) => void;
  onOpenCreateTask: (
    status?: TaskStatus,
    startDate?: string,
    allDay?: boolean,
    parentTaskId?: string,
    sprintId?: string,
  ) => void;
  onCreateTaskInline: (title: string, parentTaskId?: string, isParentTask?: boolean) => Promise<void>;
  onAddSubtask: (task: Task) => void;
  onEditGroup: (group: Task) => void;
  onDeleteGroup: (group: Task) => Promise<void>;
  onReorderTasks: (group: Task, tasks: Task[]) => Promise<void>;
  onCreateDate: (date: string) => void;
  onCreateSprintTask: (sprintId: string, title: string) => Promise<void>;
  onCreateSprint: (values: SprintCreateValues) => Promise<void>;
  onUpdateSprint: (sprintId: string, values: SprintCreateValues) => Promise<void>;
  onAddTasksToSprint: (sprintId: string, taskIds: string[]) => Promise<void>;
  onBulkUpdateTasks: (taskIds: string[], status: TaskStatus) => Promise<void>;
  onStartSprint: (sprintId: string) => Promise<void>;
  onCompleteSprint: (sprintId: string) => Promise<void>;
  onReopenSprint: (sprintId: string) => Promise<void>;
  onRemoveTaskFromSprint: (sprintId: string, taskId: string) => Promise<void>;
  isSprintBusy: boolean;
}

export default function ProjectViewContent({
  projectId,
  projectType,
  viewMode,
  tasks,
  sprints,
  dependencies,
  members,
  tasksLoading,
  tasksError,
  onTaskClick,
  onOpenChat,
  onTaskMove,
  onOpenCreateTask,
  onCreateTaskInline,
  onAddSubtask,
  onEditGroup,
  onDeleteGroup,
  onReorderTasks,
  onCreateDate,
  onCreateSprintTask,
  onCreateSprint,
  onUpdateSprint,
  onAddTasksToSprint,
  onBulkUpdateTasks,
  onStartSprint,
  onCompleteSprint,
  onReopenSprint,
  onRemoveTaskFromSprint,
  isSprintBusy,
}: ProjectViewContentProps) {
  const isSoftwareProject = projectType === ProjectType.SOFTWARE_DEVELOPMENT;

  return (
    <div className="min-w-0 flex-1 overflow-y-auto pr-1">
      {tasksLoading && <div className="rounded border border-slate-200 bg-white py-24 text-center text-sm font-semibold text-slate-400">Đang tải công việc...</div>}
      {tasksError && <div className="rounded border border-red-100 bg-red-50 py-24 text-center text-sm font-semibold text-red-500">Không thể tải danh sách công việc. Vui lòng kiểm tra lại dịch vụ backend.</div>}

      {!tasksLoading && !tasksError && viewMode === "summary" && (isSoftwareProject ? (
        <SummaryView tasks={tasks} members={members} sprints={sprints} />
      ) : (
        <GeneralSummaryView tasks={tasks} members={members} />
      ))}

      {!tasksLoading && !tasksError && viewMode === "board" && (
        <BoardView tasks={tasks} onTaskClick={onTaskClick} onOpenChat={onOpenChat} onTaskMove={onTaskMove} onAddTask={onOpenCreateTask} />
      )}

      {!tasksLoading && !tasksError && viewMode === "list" && (isSoftwareProject ? (
        <SoftwareBacklogView
          tasks={tasks}
          sprints={sprints}
          onTaskClick={onTaskClick}
          onOpenChat={onOpenChat}
          onCreateTask={(sprintId) => onOpenCreateTask(TaskStatus.TODO, undefined, false, undefined, sprintId)}
          onCreateSprintTask={onCreateSprintTask}
          onCreateSprint={onCreateSprint}
          onUpdateSprint={onUpdateSprint}
          onAddTasksToSprint={onAddTasksToSprint}
          onBulkUpdateTasks={onBulkUpdateTasks}
          onStartSprint={onStartSprint}
          onCompleteSprint={onCompleteSprint}
          onReopenSprint={onReopenSprint}
          onRemoveTaskFromSprint={onRemoveTaskFromSprint}
          isBusy={isSprintBusy}
        />
      ) : (
        <ListView
          tasks={tasks}
          projectType={projectType}
          onTaskClick={onTaskClick}
          onOpenChat={onOpenChat}
          onAddTask={() => onOpenCreateTask()}
          onAddTaskInline={onCreateTaskInline}
          onAddSubtask={onAddSubtask}
          onEditGroup={onEditGroup}
          onDeleteGroup={onDeleteGroup}
          onReorderTasks={onReorderTasks}
        />
      ))}

      {!tasksLoading && !tasksError && viewMode === "calendar" && (
        <CalendarView tasks={tasks} onTaskClick={onTaskClick} onCreateDate={onCreateDate} />
      )}

      {!tasksLoading && !tasksError && viewMode === "gantt" && (
        <GanttView tasks={tasks} dependencies={dependencies} onTaskClick={onTaskClick} />
      )}

      {!tasksLoading && !tasksError && viewMode === "members" && (
        <div className="max-w-3xl"><ProjectMembersPanel projectId={projectId} members={members} /></div>
      )}
    </div>
  );
}

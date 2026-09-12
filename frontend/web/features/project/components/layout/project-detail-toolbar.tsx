import Link from "next/link";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { AvatarStack } from "../ui/avatar-stack";
import { ProjectTypeBadge } from "../ui/project-type-badge";
import TaskQuickFilters from "../ui/task-quick-filters";
import {
  ProjectType,
  TaskPriority,
  TaskStatus,
  type Project,
  type ProjectMember,
  type Task,
} from "@/features/project/types/project";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface ProjectDetailToolbarProps {
  project: Project;
  members: ProjectMember[];
  tasks: Task[];
  viewTitle: string;
  searchQuery: string;
  statusFilter: TaskStatus | "";
  priorityFilter: TaskPriority | "";
  assigneeFilter: string;
  selectedAssigneeIds: string[];
  onlyMyIssues: boolean;
  isFiltersActive: boolean;
  canCreateTask: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TaskStatus | "") => void;
  onPriorityChange: (value: TaskPriority | "") => void;
  onAssigneeChange: (value: string) => void;
  onToggleAssignee: (userId: string) => void;
  onToggleOnlyMyIssues: () => void;
  onClearFilters: () => void;
  onToggleMembers: () => void;
  onCreateTask: () => void;
}

function TaskStatusCounts({ tasks }: { tasks: Task[] }) {
  const intl = useAppIntl();
  const count = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status && !task.archived).length;

  return (
    <div className="ml-auto flex items-center gap-3 rounded bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
      <span>{intl.formatMessage({ id: "project.task.count.todo" }, { count: count(TaskStatus.TODO) })}</span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="text-blue-600">
        {intl.formatMessage({ id: "project.task.count.inProgress" }, { count: count(TaskStatus.IN_PROGRESS) })}
      </span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="text-emerald-600">{intl.formatMessage({ id: "project.task.count.done" }, { count: count(TaskStatus.DONE) })}</span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="text-slate-600">
        {intl.formatMessage({ id: "project.task.count.cancelled" }, { count: count(TaskStatus.CANCELLED) })}
      </span>
    </div>
  );
}

export default function ProjectDetailToolbar({
  project,
  members,
  tasks,
  viewTitle,
  searchQuery,
  statusFilter,
  priorityFilter,
  assigneeFilter,
  selectedAssigneeIds,
  onlyMyIssues,
  isFiltersActive,
  canCreateTask,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onToggleAssignee,
  onToggleOnlyMyIssues,
  onClearFilters,
  onToggleMembers,
  onCreateTask,
}: ProjectDetailToolbarProps) {
  const intl = useAppIntl();
  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Link href="/projects" className="transition hover:text-blue-600">
          {intl.formatMessage({ id: "project.list.title" })}
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span>{project.name}</span>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="capitalize text-slate-700">{viewTitle}</span>
      </div>

      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[#172B4D]">
          {viewTitle}
          <ProjectTypeBadge type={project.projectType} compact />
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMembers}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Users className="h-3.5 w-3.5 text-slate-500" />
            {intl.formatMessage({ id: "project.members.view" })}
          </button>
          {canCreateTask && (
            <button
              type="button"
              onClick={onCreateTask}
              className="inline-flex items-center gap-1.5 rounded bg-[#0052CC] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0747A6]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              {intl.formatMessage({ id: "project.task.create" })}
            </button>
          )}
        </div>
      </div>

      {project.projectType === ProjectType.SOFTWARE_DEVELOPMENT && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs font-semibold text-indigo-800">
          <span className="font-bold">{intl.formatMessage({ id: "project.workflow.software" })}</span>
          <span>{intl.formatMessage({ id: "project.view.backlog" })}</span>
          <span>{intl.formatMessage({ id: "project.workflow.sprint" })}</span>
          <span>{intl.formatMessage({ id: "project.workflow.codeReview" })}</span>
          <span>{intl.formatMessage({ id: "project.workflow.release" })}</span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={intl.formatMessage({ id: "project.task.searchPlaceholder" })}
            className="w-48 rounded border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-[#172B4D] outline-none transition placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] sm:w-56"
          />
        </div>

        <TaskQuickFilters
          members={members}
          status={statusFilter}
          priority={priorityFilter}
          assignee={assigneeFilter}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onAssigneeChange={onAssigneeChange}
        />

        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs font-semibold text-slate-500">
            {intl.formatMessage({ id: "project.task.assignedTo" })}
          </span>
          <div className="flex -space-x-1.5">
            {members.map((member) => {
              const isSelected = selectedAssigneeIds.includes(member.userId);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onToggleAssignee(member.userId)}
                  title={member.displayName}
                  className={[
                    "relative rounded-full ring-2 transition-transform",
                    isSelected
                      ? "z-10 scale-110 ring-[#0052CC]"
                      : "ring-white hover:z-10 hover:scale-105",
                  ].join(" ")}
                >
                  <AvatarStack users={[member]} size="xs" max={1} />
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleOnlyMyIssues}
          className={[
            "rounded border px-2.5 py-1.5 text-xs font-semibold transition",
            onlyMyIssues
              ? "border-[#C0B6F2] bg-[#EAE6FF] text-[#403294]"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
          ].join(" ")}
        >
          {intl.formatMessage({ id: "project.task.onlyMine" })}
        </button>

        {isFiltersActive && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs font-bold text-[#0052CC] hover:underline"
          >
            {intl.formatMessage({ id: "project.task.clearFilters" })}
          </button>
        )}

        <TaskStatusCounts tasks={tasks} />
      </div>
    </>
  );
}

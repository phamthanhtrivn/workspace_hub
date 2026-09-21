"use client";

import Link from "next/link";
import { ChevronRight, Menu, Plus, UserPlus } from "lucide-react";
import { AvatarStack } from "../ui/avatar-stack";
import { ProjectSearchInput } from "../ui/project-form-controls";
import TaskQuickFilters from "../ui/task-quick-filters";
import {
  TaskPriority,
  TaskStatus,
  type Project,
  type ProjectMember,
  type Task,
} from "@/features/project/types/project";
import type { ProjectViewMode } from "./project-detail-sidebar";
import { Button } from "@/components/ui/button";

interface ProjectDetailToolbarProps {
  project: Project;
  members: ProjectMember[];
  tasks: Task[];
  viewTitle: string;
  viewMode?: ProjectViewMode;
  searchQuery: string;
  statusFilter: TaskStatus | "";
  priorityFilter: TaskPriority | "";
  assigneeFilter: string;
  selectedAssigneeIds: string[];
  onlyMyIssues: boolean;
  isFiltersActive: boolean;
  canCreateTask: boolean;
  canInviteMembers?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TaskStatus | "") => void;
  onPriorityChange: (value: TaskPriority | "") => void;
  onAssigneeChange: (value: string) => void;
  onToggleAssignee: (userId: string) => void;
  onToggleOnlyMyIssues: () => void;
  onClearFilters: () => void;
  onToggleMembers?: () => void;
  onOpenProjectNavigation: () => void;
  onCreateTask: () => void;
  onInviteMembers?: () => void;
}

function TaskStatusCounts({ tasks }: { tasks: Task[] }) {
  const count = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status && !task.archived).length;

  return (
    <div className="ml-auto flex items-center gap-3 rounded-lg bg-slate-100/80 px-2.5 py-1 text-[11px] font-bold text-slate-500">
      <span>{count(TaskStatus.TODO)} To Do</span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="text-blue-600">{count(TaskStatus.IN_PROGRESS)} In Progress</span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="text-amber-600">{count(TaskStatus.IN_REVIEW)} In Review</span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="text-emerald-600">{count(TaskStatus.DONE)} Done</span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="text-red-600">{count(TaskStatus.CANCELLED)} Cancelled</span>
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
  viewMode,
  canInviteMembers,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onToggleAssignee,
  onToggleOnlyMyIssues,
  onClearFilters,
  onOpenProjectNavigation,
  onCreateTask,
  onInviteMembers,
}: ProjectDetailToolbarProps) {
  const isMembersView = viewMode === "members";

  return (
    <>
      <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-500">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onOpenProjectNavigation}
          aria-label="Open project navigation"
          className="mr-1 h-8 w-8 shrink-0 text-slate-600 hover:bg-slate-100 hover:text-[#0052CC] lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Link
          href="/projects"
          className="shrink-0 transition hover:text-blue-600"
        >
          Projects
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="truncate">{project.name}</span>
        <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="shrink-0 capitalize text-slate-700">{viewTitle}</span>
      </div>

      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#172B4D]">
            {viewTitle}
          </h1>
          {isMembersView && (
            <p className="mt-1 text-xs text-slate-500">
              Manage members, roles, and project access permissions.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isMembersView
            ? canInviteMembers &&
              onInviteMembers && (
                <Button
                  type="button"
                  onClick={onInviteMembers}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0052CC] hover:bg-[#0747A6] px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                  <UserPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Invite Member
                </Button>
              )
            : canCreateTask && (
                <Button
                  type="button"
                  onClick={onCreateTask}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0052CC] hover:bg-[#0747A6] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Create Task
                </Button>
              )}
        </div>
      </div>

      {!isMembersView && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
          <ProjectSearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search tasks..."
            ariaLabel="Search tasks"
            className="flex-none w-48 sm:w-56"
          />

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
              Assignee:
            </span>
            <div className="flex -space-x-1.5">
              {members.map((member) => {
                const isSelected = selectedAssigneeIds.includes(member.userId);
                return (
                  <Button
                    key={member.id}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleAssignee(member.userId)}
                    title={member.displayName}
                    className={[
                      "relative h-6 w-6 rounded-full ring-2 transition-transform cursor-pointer p-0",
                      isSelected
                        ? "z-10 scale-110 ring-[#0052CC]"
                        : "ring-white hover:z-10 hover:scale-105",
                    ].join(" ")}
                  >
                    <AvatarStack users={[member]} size="xs" max={1} />
                  </Button>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleOnlyMyIssues}
            className={[
              "h-9 rounded-xl px-3 text-xs font-semibold transition cursor-pointer",
              onlyMyIssues
                ? "border-[#C0B6F2] bg-[#EAE6FF] text-[#403294] hover:bg-[#EAE6FF]"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            Only My Tasks
          </Button>

          {isFiltersActive && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onClearFilters}
              className="h-auto p-0 text-xs font-bold text-[#0052CC] hover:underline cursor-pointer"
            >
              Clear filters
            </Button>
          )}

          <TaskStatusCounts tasks={tasks} />
        </div>
      )}
    </>
  );
}

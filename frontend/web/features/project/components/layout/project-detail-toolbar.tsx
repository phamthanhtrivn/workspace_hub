"use client";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

import Link from "next/link";
import { Loader2, Menu, MessageCircle, Plus, UserPlus } from "lucide-react";
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
import type { ProjectTaskStatusCounts } from "@/features/project/api/task.api";
import type { ProjectViewMode } from "./project-detail-sidebar";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ProjectDetailToolbarProps {
  project: Project;
  members: ProjectMember[];
  tasks: Task[];
  taskStatusCounts?: ProjectTaskStatusCounts;
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
  canOpenProjectChat?: boolean;
  canInviteMembers?: boolean;
  isOpeningProjectChat?: boolean;
  onViewChange?: (view: ProjectViewMode) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TaskStatus | "") => void;
  onPriorityChange: (value: TaskPriority | "") => void;
  onAssigneeChange: (value: string) => void;
  onToggleAssignee: (userId: string) => void;
  onToggleOnlyMyIssues: () => void;
  onClearFilters: () => void;
  onToggleMembers?: () => void;
  onOpenProjectNavigation: () => void;
  navigationOpen?: boolean;
  onCreateTask: () => void;
  onInviteMembers?: () => void;
  onOpenProjectChat?: () => void;
}

function TaskStatusCounts({
  tasks,
  counts,
}: {
  tasks: Task[];
  counts?: ProjectTaskStatusCounts;
}) {
  const count = (status: TaskStatus) =>
    counts?.[status] ??
    tasks.filter((task) => task.status === status && !task.archived).length;

  return (
    <div className="flex w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground [&>span:not(:empty)]:whitespace-nowrap">
      <span>{count(TaskStatus.TODO)} To Do</span>
      <span className="h-3 w-px bg-accent" />
      <span className="text-info-content">{count(TaskStatus.IN_PROGRESS)} In Progress</span>
      <span className="h-3 w-px bg-accent" />
      <span className="text-warning-content">{count(TaskStatus.IN_REVIEW)} In Review</span>
      <span className="h-3 w-px bg-accent" />
      <span className="text-success-content">{count(TaskStatus.DONE)} Done</span>
      <span className="h-3 w-px bg-accent" />
      <span className="text-destructive-content">{count(TaskStatus.CANCELLED)} Cancelled</span>
    </div>
  );
}

export default function ProjectDetailToolbar({
  project,
  members,
  tasks,
  taskStatusCounts,
  viewTitle,
  searchQuery,
  statusFilter,
  priorityFilter,
  assigneeFilter,
  selectedAssigneeIds,
  onlyMyIssues,
  isFiltersActive,
  canCreateTask,
  canOpenProjectChat,
  viewMode,
  canInviteMembers,
  isOpeningProjectChat,
  onViewChange,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onToggleAssignee,
  onToggleOnlyMyIssues,
  onClearFilters,
  onOpenProjectNavigation,
  navigationOpen,
  onCreateTask,
  onInviteMembers,
  onOpenProjectChat,
}: ProjectDetailToolbarProps) {
  const isMembersView = viewMode === "members";
  const isDocumentsView = viewMode === "documents";
  const isTaskView = !isMembersView && !isDocumentsView;

  return (
    <header className="min-w-0 shrink-0">
      <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onOpenProjectNavigation}
          aria-label="Open project navigation" aria-expanded={navigationOpen} aria-controls="project-navigation"
          className="mr-1 h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-info-content lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-wrap gap-y-1 text-xs font-medium text-muted-foreground">
            <BreadcrumbItem className="shrink-0">
              <BreadcrumbLink asChild className="hover:text-info-content">
                <Link href="/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 text-muted-foreground" />
            <BreadcrumbItem className="min-w-0 max-w-48 @min-[640px]/project-detail:max-w-72">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onViewChange?.("overview")}
                className="h-auto min-w-0 max-w-full shrink justify-start rounded-control p-0 text-xs font-medium text-muted-foreground shadow-none hover:bg-transparent hover:text-info-content focus-visible:ring-ring"
              >
                <span className="truncate">{project.name}</span>
              </Button>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 text-muted-foreground" />
            <BreadcrumbItem className="shrink-0">
              <BreadcrumbPage className="font-semibold text-foreground">
                {viewTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-page-title font-semibold tracking-tight text-foreground">
            {viewTitle}
          </h1>
          {isMembersView && (
            <p className="mt-1 text-xs text-muted-foreground">
              Manage members, roles, and project access permissions.
            </p>
          )}
          {isDocumentsView && (
            <p className="mt-1 text-xs text-muted-foreground">
              Upload and organize files for this project.
            </p>
          )}
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-2">
          {canOpenProjectChat && onOpenProjectChat && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenProjectChat}
              disabled={isOpeningProjectChat}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-control border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isOpeningProjectChat ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              Project Chat
            </Button>
          )}
          {isMembersView
            ? canInviteMembers &&
              onInviteMembers && (
                <Button
                  type="button"
                  onClick={onInviteMembers}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-control bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-semibold text-primary-foreground transition"
                >
                  <UserPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Invite Member
                </Button>
              )
            : isTaskView &&
              canCreateTask && (
                <Button
                  type="button"
                  onClick={onCreateTask}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-control bg-primary hover:bg-primary-hover px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Create Task
                </Button>
              )}
        </div>
      </div>

      {isTaskView && (
        <>
          <div className="mt-4">
            <TaskStatusCounts tasks={tasks} counts={taskStatusCounts} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 border-b border-border pb-4">
            <ProjectSearchInput
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search tasks..."
              ariaLabel="Search tasks"
              className="w-full min-w-0 flex-none @min-[800px]/project-detail:w-52"
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

            <Collapsible className="min-w-0 max-w-full"><CollapsibleTrigger render={<Button type="button" variant="ghost" className="group h-auto w-full justify-between whitespace-normal text-left" />} className="min-h-9 cursor-pointer rounded-control px-2 py-2 text-xs font-semibold text-muted-foreground">Assignee options{selectedAssigneeIds.length > 0 ? ` (${selectedAssigneeIds.length} selected)` : ""}{onlyMyIssues ? " · My tasks" : ""}</CollapsibleTrigger><CollapsibleContent><div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1">
              <span className="mr-1 text-xs font-semibold text-muted-foreground">
                Assignee:
              </span>
              <div className="flex min-w-0 max-w-full flex-wrap gap-y-2 -space-x-1.5">
                {members.map((member) => {
                  const isSelected = selectedAssigneeIds.includes(member.userId);
                  return (
                    <Button
                      key={member.id}
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleAssignee(member.userId)}
                      aria-label={`Filter tasks assigned to ${member.displayName}`} aria-pressed={isSelected}
                      title={member.displayName}
                      className={[
                        "relative h-6 w-6 rounded-full ring-2 transition-transform cursor-pointer p-0",
                        isSelected
                          ? "z-10 scale-110 ring-primary"
                          : "ring-border hover:z-10",
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
              aria-pressed={onlyMyIssues}
              onClick={onToggleOnlyMyIssues}
              className={[
                "h-9 rounded-control px-3 text-xs font-semibold transition cursor-pointer",
                onlyMyIssues
                  ? "border-border bg-primary-soft text-info-content hover:bg-primary-soft"
                  : "border-border bg-card text-muted-foreground hover:bg-background",
              ].join(" ")}
            >
              Only My Tasks
            </Button>

            </div></CollapsibleContent>
    </Collapsible>
            {isFiltersActive && (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={onClearFilters}
                className="h-auto p-0 text-xs font-semibold text-info-content hover:underline cursor-pointer"
              >
                Clear filters
              </Button>
            )}
          </div>
        </>
      )}
    </header>
  );
}

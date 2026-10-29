"use client";

import {
  TaskStatus,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import type { TaskDetailDrawerProps } from "@/features/project/types/task-detail-drawer.types";
import { useTaskDetailDrawerState } from "@/features/project/hooks/use-task-detail-drawer-state";
import { getIssueIcon, getIssueKey } from "../ui/task-card";
import TaskChatButton from "../ui/task-chat-button";
import TaskActivityPanel from "./task-activity-panel";
import TaskChecklistSection from "./task-checklist-section";
import TaskCommentsSection from "./task-comments-section";
import TaskDocumentsSection from "./task-documents-section";
import { TaskReopenButton } from "./task-reopen-button";
import TaskStatusPicker from "./task-status-picker";
import TaskLabelsPicker from "./task-labels-picker";
import TaskDependenciesSection from "./task-dependencies-section";
import TaskSubtasksSection from "./task-subtasks-section";
import TaskPropertiesPanel from "./task-properties-panel";
import TaskLabelBadges from "../ui/task-label-badges";
import { FileText, History, LockKeyhole, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectTaskFocusButton } from "@/features/pomodoro/components/task-focus-button";
import { TaskFocusHistory } from "@/features/pomodoro/components/task-focus-history";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function TaskDetailDrawer({
  task,
  tasks = [],
  members = [],
  onClose,
  onOpenChat,
  onTaskClick,
  onUpdateTask,
  onCreateSubtask,
  onCreateChecklist,
  onUpdateChecklist,
  onDeleteChecklist,
  labels = [],
  onToggleLabel,
  dependencies = [],
  onCreateDependency,
  onDeleteDependency,
  canEditTask = false,
  canContributeTask = false,
  canComment = false,
}: TaskDetailDrawerProps) {
  const {
    activeTab,
    handleTabChange,
    isEditingTitle,
    setIsEditingTitle,
    tempTitle,
    setTempTitle,
    handleTitleSave,
    isEditingDesc,
    setIsEditingDesc,
    tempDesc,
    setTempDesc,
    handleDescSave,
    isReadOnly,
    canChangeStatus,
    memberDisplayName,
    activities,
    isActivitiesLoading,
    isActivitiesError,
    refetchActivities,
    handleStatusChange,
    handleAssigneeChange,
    handlePriorityChange,
    handleParentTaskChange,
    handleAllDayChange,
    handleToggleLabel: onToggleLabelItem,
    handleAddDependency,
    handleDeleteDependency,
    handleDueDateChange,
    handleStartDateChange,
  } = useTaskDetailDrawerState({
    task,
    tasks,
    members,
    onClose,
    onUpdateTask,
    onToggleLabel,
    onCreateDependency,
    onDeleteDependency,
    canEditTask,
    canContributeTask,
  });

  if (!task) return null;

  const issueKey = getIssueKey(task);
  const isTaskClosed = isTerminalTaskStatus(task.status);
  const isCollaborationReadOnly = isTaskClosed || !canContributeTask;
  const areCommentsReadOnly = isTaskClosed || !canComment;

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      {/* Backdrop */}


      {/* Drawer */}
      <SheetContent showCloseButton={false} overlayClassName="bg-overlay/20 transition-opacity" aria-label={`Task details: ${task.title}`} className="flex h-dvh min-h-0 min-w-0 w-full max-w-xl flex-col overflow-hidden border-0 border-l border-border bg-card shadow-none animate-in slide-in-from-right duration-200 sm:max-w-2xl">
<Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as "details" | "activity")} className="min-h-0 min-w-0 flex-1 gap-0">
        {/* ── Panel Header ── */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {getIssueIcon()}
            <span className="font-semibold uppercase tracking-wide text-foreground hover:underline">
              {issueKey}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isTaskClosed && canEditTask && !task.archived && <TaskReopenButton task={task} parent={tasks.find(parent => parent.id === task.parentTaskId)} onTaskClick={onTaskClick} />}
            <ProjectTaskFocusButton task={task} />
            <TaskChatButton task={task} onOpenChat={onOpenChat} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 rounded-control text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              title="Close details"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Tabs bar ── */}
        <TabsList
          className="h-auto w-full justify-start rounded-none bg-transparent p-0 flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-4 sm:px-5"

          aria-label="Task content"
        >
          <TabsTrigger unstyled value={"details"}






            className={[
              "flex h-9 items-center gap-1.5 rounded-none border-b-2 px-2 py-2 text-xs font-semibold transition shadow-none cursor-pointer",
              activeTab === "details"
                ? "border-link text-info-content hover:text-info-content hover:bg-transparent"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-transparent",
            ].join(" ")}
          >
            <FileText className="h-3.5 w-3.5" />
            Details
          </TabsTrigger>
          <TabsTrigger unstyled value={"activity"}






            className={[
              "flex h-9 items-center gap-1.5 rounded-none border-b-2 px-2 py-2 text-xs font-semibold transition shadow-none cursor-pointer",
              activeTab === "activity"
                ? "border-link text-info-content hover:text-info-content hover:bg-transparent"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-transparent",
            ].join(" ")}
          >
            <History className="h-3.5 w-3.5" />
            Activity
            {activities.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {activities.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {(isTerminalTaskStatus(task.status) ||
          (!canEditTask && !canContributeTask)) && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-panel border border-border bg-success-soft px-3 py-2 text-xs font-semibold text-success-content">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
            {isTerminalTaskStatus(task.status)
              ? task.status === TaskStatus.CANCELLED
                ? "This task is cancelled and read-only."
                : "This task is completed and read-only."
              : "You have view-only access to this task."}
          </div>
        )}

        {/* ── Main details content ── */}
        <TabsContent value="details" forceMount

          className={[
            "min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4.5 space-y-5.5 sm:px-5",
            activeTab === "details" ? "block" : "hidden",
          ].join(" ")}
        >
          {/* Title & Labels */}
          <div className="flex flex-wrap items-start gap-2.5">
            {isEditingTitle && !isReadOnly ? (
              <div className="min-w-0 flex-1 basis-full space-y-1.5">
                <Input aria-label="Task title"
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleTitleSave();
                    if (e.key === "Escape") {
                      setTempTitle(task.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="w-full rounded-control border-primary p-2 text-xl font-semibold leading-snug text-foreground sm:text-2xl"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleTitleSave()}
                    className="h-7 cursor-pointer rounded-control bg-primary hover:bg-primary-hover px-2.5 text-xs font-semibold text-primary-foreground"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTempTitle(task.title);
                      setIsEditingTitle(false);
                    }}
                    className="h-7 cursor-pointer rounded-control bg-muted hover:bg-accent px-2.5 text-xs font-semibold text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="min-w-0 flex-1">
                <Button variant="unstyled" type="button" disabled={isReadOnly} aria-label="Edit task title"
                  onClick={
                    isReadOnly
                      ? undefined
                      : () => {
                          setTempTitle(task.title);
                          setIsEditingTitle(true);
                        }
                  }
                  className={[
                    "w-full text-left min-w-0 flex-1 rounded border border-transparent p-1 -ml-1 text-section-title font-semibold leading-snug text-foreground break-words transition text-section-title",
                    isReadOnly
                      ? "cursor-default"
                      : "cursor-pointer hover:border-input hover:bg-background",
                  ].join(" ")}
                >
                  {task.title}
                </Button>
                </h2>
                <TaskLabelBadges
                  labels={task.labels}
                  className="mt-1 shrink-0"
                />
              </>
            )}
          </div>

          {/* Status & Dependencies Bar */}
          <div className="flex flex-wrap items-center gap-2 select-none">
            <TaskStatusPicker
              status={task.status}
              onChange={handleStatusChange}
              disabled={!canChangeStatus}
            />

            <TaskLabelsPicker
              taskLabels={task.labels}
              availableLabels={labels}
              onToggleLabel={onToggleLabelItem}
              disabled={isReadOnly}
              showSelectedBadges={false}
            />

            <TaskDependenciesSection
              task={task}
              dependencies={dependencies}
              tasks={tasks}
              onCreateDependency={
                onCreateDependency ? handleAddDependency : undefined
              }
              onDeleteDependency={
                onDeleteDependency ? handleDeleteDependency : undefined
              }
              disabled={isReadOnly}
            />
          </div>

          {/* Description Section */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Description
            </h3>
            {isEditingDesc && !isReadOnly ? (
              <div className="space-y-2">
                <Textarea aria-label="Task description"
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  rows={4}
                  placeholder="Add a description..."
                  className="w-full rounded-control border-primary p-2.5 text-xs text-foreground"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleDescSave()}
                    className="h-7 cursor-pointer rounded-control bg-primary hover:bg-primary-hover px-2.5 text-xs font-semibold text-primary-foreground"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTempDesc(task.description || "");
                      setIsEditingDesc(false);
                    }}
                    className="h-7 cursor-pointer rounded-control bg-muted hover:bg-accent px-2.5 text-xs font-semibold text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="unstyled" type="button" disabled={isReadOnly} aria-label="Edit task description"
                onClick={
                  isReadOnly
                    ? undefined
                    : () => {
                        setTempDesc(task.description || "");
                        setIsEditingDesc(true);
                      }
                }
                className={[
                  "w-full text-left min-h-[60px] p-2.5 rounded-panel border border-transparent bg-background text-xs transition leading-relaxed text-muted-foreground break-words",
                  isReadOnly
                    ? "cursor-default"
                    : "cursor-pointer hover:border-input",
                  !task.description && "text-muted-foreground font-medium italic",
                ].join(" ")}
              >
                {task.description || "Add a description..."}
              </Button>
            )}
          </div>

          {/* Subtasks Section */}
          <TaskSubtasksSection
            task={task}
            tasks={tasks}
            isReadOnly={isReadOnly}
            onCreateSubtask={onCreateSubtask}
            onTaskClick={onTaskClick}
            onMarkParentDone={() => handleStatusChange(TaskStatus.DONE)}
          />

          {/* Checklist Section */}
          <TaskChecklistSection
            task={task}
            isReadOnly={isCollaborationReadOnly}
            onCreate={onCreateChecklist}
            onUpdate={onUpdateChecklist}
            onDelete={onDeleteChecklist}
          />

          <TaskDocumentsSection
            task={task}
            isReadOnly={isCollaborationReadOnly}
          />

          {/* Details Accordion / Properties Panel */}
          <TaskPropertiesPanel
            key={task.id}
            task={task}
            tasks={tasks}
            members={members}
            isReadOnly={isReadOnly}
            dependencies={dependencies}
            memberDisplayName={memberDisplayName}
            onAssigneeChange={handleAssigneeChange}
            onPriorityChange={handlePriorityChange}
            onParentTaskChange={handleParentTaskChange}
            onAllDayChange={handleAllDayChange}
            onStartDateChange={handleStartDateChange}
            onDueDateChange={handleDueDateChange}
          />

          {/* Comments Section */}
          <TaskFocusHistory target={{ taskId: task.id }} />
          <TaskCommentsSection
            task={task}
            members={members}
            isReadOnly={areCommentsReadOnly}
          />
        </TabsContent>

        {/* ── Activity Tab Content ── */}
        <TabsContent value="activity" className="m-0 flex min-h-0 flex-1 flex-col">{activeTab === "activity" && (
          <TaskActivityPanel
            activities={activities}
            tasks={tasks}
            members={members}
            isLoading={isActivitiesLoading}
            isError={isActivitiesError}
            onRefresh={() => void refetchActivities()}
          />
        )}</TabsContent>
      </Tabs>
</SheetContent>
    </Sheet>
  );
}

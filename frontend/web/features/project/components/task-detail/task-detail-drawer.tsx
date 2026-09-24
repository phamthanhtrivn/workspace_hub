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
    handleEstimateSave,
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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200 sm:max-w-2xl">
        {/* ── Panel Header ── */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            {getIssueIcon()}
            <span className="font-semibold uppercase tracking-wide text-slate-700 hover:underline">
              {issueKey}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <TaskChatButton task={task} onOpenChat={onOpenChat} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
              title="Close details"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Tabs bar ── */}
        <div
          className="flex shrink-0 items-center gap-1 border-b border-slate-200 px-5"
          role="tablist"
          aria-label="Task content"
        >
          <Button
            type="button"
            role="tab"
            variant="ghost"
            size="sm"
            aria-selected={activeTab === "details"}
            onClick={() => handleTabChange("details")}
            className={[
              "flex h-9 items-center gap-1.5 rounded-none border-b-2 px-2 py-2 text-xs font-bold transition shadow-none cursor-pointer",
              activeTab === "details"
                ? "border-[#0052CC] text-[#0052CC] hover:text-[#0052CC] hover:bg-transparent"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-transparent",
            ].join(" ")}
          >
            <FileText className="h-3.5 w-3.5" />
            Details
          </Button>
          <Button
            type="button"
            role="tab"
            variant="ghost"
            size="sm"
            aria-selected={activeTab === "activity"}
            onClick={() => handleTabChange("activity")}
            className={[
              "flex h-9 items-center gap-1.5 rounded-none border-b-2 px-2 py-2 text-xs font-bold transition shadow-none cursor-pointer",
              activeTab === "activity"
                ? "border-[#0052CC] text-[#0052CC] hover:text-[#0052CC] hover:bg-transparent"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-transparent",
            ].join(" ")}
          >
            <History className="h-3.5 w-3.5" />
            Activity
            {activities.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
                {activities.length}
              </span>
            )}
          </Button>
        </div>

        {(isTerminalTaskStatus(task.status) ||
          (!canEditTask && !canContributeTask)) && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
            {isTerminalTaskStatus(task.status)
              ? task.status === TaskStatus.CANCELLED
                ? "This task is cancelled and read-only."
                : "This task is completed and read-only."
              : "You have view-only access to this task."}
          </div>
        )}

        {/* ── Main details content ── */}
        <div
          role="tabpanel"
          className={[
            "flex-1 overflow-y-auto px-5 py-4.5 space-y-5.5",
            activeTab === "details" ? "block" : "hidden",
          ].join(" ")}
        >
          {/* Title & Labels */}
          <div className="flex flex-wrap items-start gap-2.5">
            {isEditingTitle && !isReadOnly ? (
              <div className="min-w-0 flex-1 basis-full space-y-1.5">
                <Input
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
                  className="w-full rounded-xl border-[#0052CC] p-2 text-xl font-bold leading-snug text-[#172B4D] sm:text-2xl"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleTitleSave()}
                    className="h-7 cursor-pointer rounded-lg bg-[#0052CC] hover:bg-[#0747A6] px-2.5 text-xs font-semibold text-white"
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
                    className="h-7 cursor-pointer rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2
                  onClick={
                    isReadOnly
                      ? undefined
                      : () => {
                          setTempTitle(task.title);
                          setIsEditingTitle(true);
                        }
                  }
                  className={[
                    "min-w-0 flex-1 rounded border border-transparent p-1 -ml-1 text-xl font-bold leading-snug text-[#172B4D] break-words transition sm:text-2xl",
                    isReadOnly
                      ? "cursor-default"
                      : "cursor-pointer hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {task.title}
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
              taskId={task.id}
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
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Description
            </h3>
            {isEditingDesc && !isReadOnly ? (
              <div className="space-y-2">
                <Textarea
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  rows={4}
                  placeholder="Add a description..."
                  className="w-full rounded-xl border-[#0052CC] p-2.5 text-xs text-[#172B4D]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleDescSave()}
                    className="h-7 cursor-pointer rounded-lg bg-[#0052CC] hover:bg-[#0747A6] px-2.5 text-xs font-semibold text-white"
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
                    className="h-7 cursor-pointer rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={
                  isReadOnly
                    ? undefined
                    : () => {
                        setTempDesc(task.description || "");
                        setIsEditingDesc(true);
                      }
                }
                className={[
                  "min-h-[60px] p-2.5 rounded-xl border border-transparent bg-slate-50/50 text-xs transition leading-relaxed text-[#42526E] break-words",
                  isReadOnly
                    ? "cursor-default"
                    : "cursor-pointer hover:border-slate-300",
                  !task.description && "text-slate-400 font-medium italic",
                ].join(" ")}
              >
                {task.description || "Add a description..."}
              </div>
            )}
          </div>

          {/* Subtasks Section */}
          <TaskSubtasksSection
            task={task}
            tasks={tasks}
            isReadOnly={isReadOnly}
            onCreateSubtask={onCreateSubtask}
            onTaskClick={onTaskClick}
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
            key={`${task.id}:${task.estimatedMinutes}`}
            task={task}
            tasks={tasks}
            members={members}
            isReadOnly={isReadOnly}
            memberDisplayName={memberDisplayName}
            onAssigneeChange={handleAssigneeChange}
            onPriorityChange={handlePriorityChange}
            onParentTaskChange={handleParentTaskChange}
            onAllDayChange={handleAllDayChange}
            onStartDateChange={handleStartDateChange}
            onDueDateChange={handleDueDateChange}
            onEstimateSave={handleEstimateSave}
          />

          {/* Comments Section */}
          <TaskCommentsSection
            task={task}
            members={members}
            isReadOnly={areCommentsReadOnly}
          />
        </div>

        {/* ── Activity Tab Content ── */}
        {activeTab === "activity" && (
          <TaskActivityPanel
            activities={activities}
            tasks={tasks}
            members={members}
            isLoading={isActivitiesLoading}
            isError={isActivitiesError}
            onRefresh={() => void refetchActivities()}
          />
        )}
      </div>
    </div>
  );
}

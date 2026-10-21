"use client";
import { useId as useControlledPopupId } from "react";

import { useRef, useState } from "react";
import { Link2 } from "lucide-react";
import type { Task, TaskDependency } from "@/features/project/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnchoredPopover } from "@/components/ui/anchored-popup";

interface TaskDependenciesSectionProps {
  task: Task;
  dependencies: TaskDependency[];
  tasks: Task[];
  onCreateDependency?: (predecessorTaskId: string) => Promise<void> | void;
  onDeleteDependency?: (predecessorTaskId: string) => Promise<void> | void;
  disabled?: boolean;
}

function wouldCreateDependencyCycle(
  dependencies: TaskDependency[],
  predecessorTaskId: string,
  successorTaskId: string,
): boolean {
  const successors = new Map<string, string[]>();
  for (const dependency of dependencies) {
    const adjacent = successors.get(dependency.predecessorTaskId) ?? [];
    adjacent.push(dependency.successorTaskId);
    successors.set(dependency.predecessorTaskId, adjacent);
  }

  const pending = [successorTaskId];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const taskId = pending.pop();
    if (!taskId || visited.has(taskId)) continue;
    if (taskId === predecessorTaskId) return true;
    visited.add(taskId);
    pending.push(...(successors.get(taskId) ?? []));
  }
  return false;
}

function isDirectParentChild(task: Task, candidate: Task): boolean {
  return task.parentTaskId === candidate.id || candidate.parentTaskId === task.id;
}

export default function TaskDependenciesSection({
  task,
  dependencies,
  tasks,
  onCreateDependency,
  onDeleteDependency,
  disabled = false,
}: TaskDependenciesSectionProps) {
  const controlledPopupId = useControlledPopupId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);



  const taskDependencies = dependencies.filter(
    (item) => item.successorTaskId === task.id,
  );
  const blockingDependencies = dependencies.filter(
    (item) => item.predecessorTaskId === task.id,
  );

  const dependencyCandidates = tasks.filter(
    (item) =>
      item.id !== task.id &&
      !item.archived &&
      !isDirectParentChild(task, item) &&
      !taskDependencies.some(
        (dependency) => dependency.predecessorTaskId === item.id,
      ) &&
      !wouldCreateDependencyCycle(dependencies, item.id, task.id),
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5" ref={containerRef}>
      {onCreateDependency && !disabled && (
        <div className="relative">
          <Button aria-expanded={isOpen} aria-controls={`${controlledPopupId}-isOpen`} aria-haspopup="dialog"
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-7 cursor-pointer items-center gap-1.5 rounded-control border border-dashed border-input px-2.5 text-xs font-semibold text-muted-foreground transition hover:border-info-outline hover:bg-info-soft hover:text-info-content"
          >
            <Link2 className="h-3.5 w-3.5" />
            Blocked by ({taskDependencies.length})
          </Button>
          {isOpen && (
            <AnchoredPopover id={`${controlledPopupId}-isOpen`} onClose={() => setIsOpen(false)} side="bottom" align="start" aria-label="Task dependencies" className="max-h-60 w-64 overflow-y-auto rounded-panel border border-border bg-card p-1.5 shadow-panel">
              {dependencyCandidates.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-muted-foreground">
                  No available tasks can block this task.
                </p>
              ) : (
                dependencyCandidates.slice(0, 20).map((candidate) => (
                  <Button
                    key={candidate.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      void onCreateDependency(candidate.id);
                    }}
                    className="flex h-auto w-full cursor-pointer justify-start truncate rounded-control px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-background"
                  >
                    Blocked by {candidate.title}
                  </Button>
                ))
              )}
            </AnchoredPopover>
          )}
        </div>
      )}

      {taskDependencies.length > 0 && (
        <div className="mt-1 flex basis-full flex-wrap gap-1.5">
          {taskDependencies.map((dependency) => {
            const predecessor = tasks.find(
              (candidate) => candidate.id === dependency.predecessorTaskId,
            );
            return (
              <Badge
                key={dependency.id}
                variant="outline"
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border-border bg-info-soft/80 px-2.5 py-0.5 text-xs font-semibold text-info-content"
              >
                <span className="truncate">
                  Blocked by {predecessor?.title || "Predecessor Task"}
                </span>
                {onDeleteDependency && !disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      void onDeleteDependency(dependency.predecessorTaskId)
                    }
                    className="ml-0.5 h-3.5 w-3.5 cursor-pointer p-0 font-semibold hover:bg-transparent hover:text-destructive-content"
                    aria-label="Remove dependency"
                  >
                    x
                  </Button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {blockingDependencies.length > 0 && (
        <div className="mt-1 flex basis-full flex-wrap gap-1.5">
          {blockingDependencies.map((dependency) => {
            const successor = tasks.find(
              (candidate) => candidate.id === dependency.successorTaskId,
            );
            return (
              <Badge
                key={dependency.id}
                variant="outline"
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border-border bg-background px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
              >
                <span className="truncate">
                  Blocking {successor?.title || "Successor Task"}
                </span>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

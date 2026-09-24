"use client";

import { useEffect, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import type { Task, TaskDependency } from "@/features/project/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Link2 className="h-3.5 w-3.5" />
            Blocked by ({taskDependencies.length})
          </Button>
          {isOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 max-h-60 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {dependencyCandidates.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-slate-400">
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
                    className="flex h-auto w-full cursor-pointer justify-start truncate rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Blocked by {candidate.title}
                  </Button>
                ))
              )}
            </div>
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
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border-indigo-200 bg-indigo-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700"
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
                    className="ml-0.5 h-3.5 w-3.5 cursor-pointer p-0 font-bold hover:bg-transparent hover:text-red-600"
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
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"
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

"use client";

import { useEffect, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import type { Task, TaskDependency } from "../types/project";

interface TaskDependenciesSectionProps {
  taskId: string;
  dependencies: TaskDependency[];
  tasks: Task[];
  onCreateDependency?: (predecessorTaskId: string) => Promise<void> | void;
  onDeleteDependency?: (predecessorTaskId: string) => Promise<void> | void;
  disabled?: boolean;
}

export default function TaskDependenciesSection({
  taskId,
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
    (item) => item.successorTaskId === taskId,
  );

  const dependencyCandidates = tasks.filter(
    (item) =>
      item.id !== taskId &&
      !taskDependencies.some(
        (dependency) => dependency.predecessorTaskId === item.id,
      ),
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5" ref={containerRef}>
      {onCreateDependency && !disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded border border-dashed border-slate-300 px-2 py-1 text-xs font-semibold text-slate-500 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Link2 className="h-3.5 w-3.5" /> Dependency (
            {taskDependencies.length})
          </button>
          {isOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded border border-slate-200 bg-white p-1.5 shadow-lg">
              {dependencyCandidates.length === 0 ? (
                <p className="px-2 py-2 text-[11px] text-slate-400">
                  Không còn task để liên kết.
                </p>
              ) : (
                dependencyCandidates.slice(0, 20).map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      void onCreateDependency(candidate.id);
                    }}
                    className="block w-full truncate rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    ← {candidate.title}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {taskDependencies.length > 0 && (
        <div className="flex basis-full flex-wrap gap-1">
          {taskDependencies.map((dependency) => {
            const predecessor = tasks.find(
              (candidate) => candidate.id === dependency.predecessorTaskId,
            );
            return (
              <span
                key={dependency.id}
                className="inline-flex max-w-full items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700"
              >
                ← {predecessor?.title || "Task trước"}
                {onDeleteDependency && !disabled && (
                  <button
                    type="button"
                    onClick={() =>
                      void onDeleteDependency(dependency.predecessorTaskId)
                    }
                    className="ml-1 font-black hover:text-red-600"
                    aria-label="Xóa dependency"
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

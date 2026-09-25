"use client";

import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type { Project } from "@/features/project/types/project";

export function ProjectCalendarsSection({
  projects,
  selectedProjectId,
  loading,
  error,
  tasksError,
  onToggleProject,
  onRetry,
}: {
  projects: Project[];
  selectedProjectId: string | null;
  loading: boolean;
  error: boolean;
  tasksError: boolean;
  onToggleProject: (projectId: string) => void;
  onRetry: () => void;
}) {
  const intl = useAppIntl();

  return (
    <section className="mt-5 flex min-h-24 flex-1 flex-col" aria-labelledby="project-calendars-heading">
      <div className="mb-2 flex shrink-0 items-center gap-2 px-2">
        <FolderKanban className="h-4 w-4 text-[var(--color-primary)]" />
        <h2
          id="project-calendars-heading"
          className="flex-1 text-sm font-semibold text-slate-700"
        >
          {intl.formatMessage({ id: "calendar.projects" })}
        </h2>
      </div>

      {loading ? (
        <p className="px-8 py-1 text-xs text-slate-500" role="status">
          {intl.formatMessage({ id: "calendar.projectsLoading" })}
        </p>
      ) : error ? (
        <div className="px-8 py-1 text-xs text-red-600" role="alert">
          <p>{intl.formatMessage({ id: "calendar.projectsLoadFailed" })}</p>
          <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onRetry}>
            {intl.formatMessage({ id: "calendar.projectsRetry" })}
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <p className="px-8 py-1 text-xs font-medium leading-5 text-slate-400">
          {intl.formatMessage({ id: "calendar.noProjects" })}
        </p>
      ) : (
        <>
          <div
            className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            role="region"
            aria-label={intl.formatMessage({ id: "calendar.projects" })}
            tabIndex={0}
          >
            {projects.map((project) => {
              const selected = selectedProjectId === project.id;
              return (
                <div key={project.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100/70">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggleProject(project.id)}
                    aria-label={project.name}
                    className="h-4.5 w-4.5 cursor-pointer rounded-[5px] border"
                    style={{ borderColor: project.color, backgroundColor: selected ? project.color : "#ffffff" }}
                  />
                  <button
                    type="button"
                    onClick={() => onToggleProject(project.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  >
                    <span className="shrink-0 text-sm leading-none" aria-hidden="true">{project.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{project.name}</span>
                  </button>
                </div>
              );
            })}
          </div>
          {tasksError && (
            <div className="px-2 text-xs text-red-600" role="alert">
              <span>{intl.formatMessage({ id: "calendar.projectTasksLoadFailed" })}</span>{" "}
              <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onRetry}>
                {intl.formatMessage({ id: "calendar.projectsRetry" })}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

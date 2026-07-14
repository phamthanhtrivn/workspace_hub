"use client";

import Link from "next/link";
import { type Project, TaskStatus } from "@/types/project";
import { ProjectStatusBadge } from "./status-badge";
import { AvatarStack } from "./avatar-stack";
import { CheckCircle2, Users, ListTodo } from "lucide-react";

export default function ProjectCard({ project }: { project: Project }) {
  const totalTasks = project.tasks.filter((t) => !t.archived).length;
  const doneTasks = project.tasks.filter(
    (t) => t.status === TaskStatus.DONE && !t.archived
  ).length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,40,84,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20"
    >
      {/* Color accent bar */}
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-2xl transition-all duration-200 group-hover:h-1.5"
        style={{ backgroundColor: project.color }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg shadow-sm ring-1 ring-slate-200"
            style={{ backgroundColor: `${project.color}14` }}
          >
            {project.icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-[var(--color-primary-dark)] group-hover:text-[var(--color-primary)]">
              {project.name}
            </h3>
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 flex items-center gap-4 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <ListTodo className="h-3.5 w-3.5" strokeWidth={2} />
          {totalTasks} tasks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
          {doneTasks} done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" strokeWidth={2} />
          {project.members.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: project.color,
            }}
          />
        </div>
      </div>

      {/* Members */}
      <div className="mt-4 flex items-center justify-between">
        <AvatarStack
          users={project.members.map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            avatarUrl: m.avatarUrl,
          }))}
          max={4}
          size="xs"
        />
        <span className="text-[10px] font-semibold text-slate-400">
          {new Date(project.updatedAt).toLocaleDateString("vi-VN")}
        </span>
      </div>
    </Link>
  );
}

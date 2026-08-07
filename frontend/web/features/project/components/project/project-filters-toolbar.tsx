"use client";

import { Search } from "lucide-react";
import { ProjectType, TaskStatus, type ProjectMember, type Task } from "@/features/project/types/project";
import { AvatarStack } from "../shared/avatar-stack";

interface ProjectFiltersToolbarProps {
  projectType: ProjectType;
  members: ProjectMember[];
  tasks: Task[];
  searchQuery: string;
  activeAssigneeFilters: string[];
  onlyMyIssues: boolean;
  onSearchChange: (value: string) => void;
  onToggleAssignee: (userId: string) => void;
  onToggleOnlyMyIssues: () => void;
  onClearFilters: () => void;
}

export default function ProjectFiltersToolbar({
  projectType,
  members,
  tasks,
  searchQuery,
  activeAssigneeFilters,
  onlyMyIssues,
  onSearchChange,
  onToggleAssignee,
  onToggleOnlyMyIssues,
  onClearFilters,
}: ProjectFiltersToolbarProps) {
  const isFiltersActive = activeAssigneeFilters.length > 0 || onlyMyIssues || searchQuery.length > 0;
  const count = (status: TaskStatus) => tasks.filter((task) => task.status === status && !task.archived).length;

  return (
    <>
      {projectType === ProjectType.SOFTWARE_DEVELOPMENT && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs font-semibold text-indigo-800">
          <span className="font-bold">Software workflow</span>
          <span>Backlog</span><span>Sprint</span><span>Code review</span><span>Release</span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm kiếm công việc..."
            className="w-48 sm:w-56 rounded border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-[#172B4D] outline-none transition placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500 font-semibold mr-1">Giao cho:</span>
          <div className="flex -space-x-1.5">
            {members.map((member) => {
              const isSelected = activeAssigneeFilters.includes(member.userId);
              return (
                <button
                  key={member.id}
                  onClick={() => onToggleAssignee(member.userId)}
                  title={member.displayName}
                  className={[
                    "relative rounded-full transition-transform ring-2",
                    isSelected ? "ring-[#0052CC] scale-110 z-10" : "ring-white hover:scale-105 hover:z-10",
                  ].join(" ")}
                >
                  <AvatarStack users={[member]} size="xs" max={1} />
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onToggleOnlyMyIssues}
          className={[
            "rounded px-2.5 py-1.5 text-xs font-semibold transition border",
            onlyMyIssues ? "bg-[#EAE6FF] text-[#403294] border-[#C0B6F2]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50",
          ].join(" ")}
        >
          Chỉ của tôi
        </button>

        {isFiltersActive && <button onClick={onClearFilters} className="text-xs font-bold text-[#0052CC] hover:underline">Xóa bộ lọc</button>}

        <div className="ml-auto flex items-center gap-3 text-[11px] font-bold text-slate-500 bg-slate-100 rounded px-2.5 py-1">
          <span>To Do: {count(TaskStatus.TODO)}</span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="text-blue-600">In Progress: {count(TaskStatus.IN_PROGRESS)}</span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="text-emerald-600">Done: {count(TaskStatus.DONE)}</span>
        </div>
      </div>
    </>
  );
}

"use client";

import { type ProjectMember, ProjectRole } from "@/types/project";
import { Avatar } from "./avatar-stack";
import { Crown, Shield, User, UserPlus } from "lucide-react";

const ROLE_CONFIG: Record<
  ProjectRole,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [ProjectRole.OWNER]: {
    label: "Owner",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: Crown,
  },
  [ProjectRole.ADMIN]: {
    label: "Admin",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Shield,
  },
  [ProjectRole.MEMBER]: {
    label: "Member",
    color: "text-slate-500",
    bg: "bg-slate-100",
    icon: User,
  },
};

export default function ProjectMembersPanel({
  members,
}: {
  members: ProjectMember[];
}) {
  const sorted = [...members].sort((a, b) => {
    const order = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
    return order[a.role] - order[b.role];
  });

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[var(--color-primary-dark)]">
          Thành viên ({members.length})
        </h3>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-[var(--color-secondary)] transition hover:bg-[var(--color-secondary)]/10"
        >
          <UserPlus className="h-3 w-3" strokeWidth={2.5} />
          Mời
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        {sorted.map((member) => {
          const roleCfg = ROLE_CONFIG[member.role];
          const RoleIcon = roleCfg.icon;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
            >
              <Avatar
                user={{
                  userId: member.userId,
                  displayName: member.displayName,
                  avatarUrl: member.avatarUrl,
                }}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--color-primary-dark)]">
                  {member.displayName}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold ${roleCfg.color}`}
                >
                  <RoleIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
                  {roleCfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

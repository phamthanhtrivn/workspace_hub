"use client";

import { useState } from "react";
import { toast } from "sonner";
import { confirmProjectAction } from "@/features/project/project-alert";
import {
  type ProjectMember,
  ProjectRole,
} from "@/features/project/types/project";
import { Avatar } from "./avatar-stack";
import InviteMemberDialog from "./invite-member-dialog";
import MemberPermissionsDialog from "./member-permissions-dialog";
import PendingInvitationsList from "./pending-invitations-list";
import { usePendingProjectInvitations } from "@/features/project/hooks/use-invitations";
import {
  useRemoveProjectMember,
  useUpdateProjectMemberPermissions,
} from "@/features/project/hooks/use-project-members";
import type { ProjectMemberPermissions } from "@/features/project/types/project";
import { Crown, Settings2, Trash2, User, UserPlus } from "lucide-react";

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
  [ProjectRole.MEMBER]: {
    label: "Member",
    color: "text-slate-500",
    bg: "bg-slate-100",
    icon: User,
  },
};

export default function ProjectMembersPanel({
  projectId,
  members,
  canInvite = false,
  canRemoveMembers = false,
  canManagePermissions = false,
}: {
  projectId: string;
  members: ProjectMember[];
  canInvite?: boolean;
  canRemoveMembers?: boolean;
  canManagePermissions?: boolean;
}) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [permissionMember, setPermissionMember] =
    useState<ProjectMember | null>(null);
  const removeMemberMutation = useRemoveProjectMember(projectId);
  const updatePermissionsMutation =
    useUpdateProjectMemberPermissions(projectId);
  const pendingInvitationsQuery = usePendingProjectInvitations(
    projectId,
    canInvite,
  );
  const pendingInvitations = pendingInvitationsQuery.data ?? [];

  const sorted = [...members].sort((a, b) => {
    const order = { OWNER: 0, MEMBER: 1 };
    return order[a.role] - order[b.role];
  });

  const handleRemoveMember = async (member: ProjectMember) => {
    const confirmed = await confirmProjectAction({
      title: `Xóa ${member.displayName} khỏi dự án?`,
      text: "Thành viên này sẽ mất quyền truy cập vào dự án.",
      confirmText: "Xóa thành viên",
      icon: "warning",
      destructive: true,
    });
    if (!confirmed) return;

    removeMemberMutation.mutate(member.userId, {
      onSuccess: () => toast.success("Đã xóa thành viên"),
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : "Không thể xóa thành viên",
        ),
    });
  };

  const handleSavePermissions = async (
    permissions: ProjectMemberPermissions,
  ) => {
    if (!permissionMember) return;
    try {
      await updatePermissionsMutation.mutateAsync({
        memberUserId: permissionMember.userId,
        permissions,
      });
      toast.success("Đã cập nhật quyền thành viên");
      setPermissionMember(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật quyền",
      );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-[var(--color-primary-dark)]">
            Thành viên ({members.length})
          </h3>
          {pendingInvitations.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">
              {pendingInvitations.length} đang chờ
            </span>
          )}
        </div>
        {canInvite && (
          <button
            type="button"
            onClick={() => setShowInviteDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-[var(--color-secondary)] transition hover:bg-[var(--color-secondary)]/10"
          >
            <UserPlus className="h-3 w-3" strokeWidth={2.5} />
            Mời
          </button>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        {sorted.map((member) => {
          const roleCfg = ROLE_CONFIG[member.role];
          const RoleIcon = roleCfg.icon;
          return (
            <div
              key={member.id}
              className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
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
              {member.role !== ProjectRole.OWNER && (
                <div className="flex shrink-0 items-center">
                  {canManagePermissions && (
                    <button
                      type="button"
                      onClick={() => setPermissionMember(member)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 opacity-0 transition hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100"
                      aria-label={`Cấp quyền cho ${member.displayName}`}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canRemoveMembers && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveMember(member)}
                      disabled={removeMemberMutation.isPending}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-40"
                      aria-label={`Xóa ${member.displayName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {pendingInvitationsQuery.isLoading && canInvite && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4" aria-label="Đang tải lời mời">
          <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-14 animate-pulse rounded-xl bg-slate-50" />
        </div>
      )}
      <PendingInvitationsList
        projectId={projectId}
        invitations={pendingInvitations}
      />
      {canInvite && (
        <InviteMemberDialog
          key={showInviteDialog ? "invite-open" : "invite-closed"}
          open={showInviteDialog}
          projectId={projectId}
          members={members}
          pendingInvitations={pendingInvitations}
          onClose={() => setShowInviteDialog(false)}
        />
      )}
      <MemberPermissionsDialog
        key={permissionMember?.id ?? "permissions-closed"}
        member={permissionMember}
        open={Boolean(permissionMember)}
        isSaving={updatePermissionsMutation.isPending}
        onClose={() => setPermissionMember(null)}
        onSave={handleSavePermissions}
      />
    </div>
  );
}

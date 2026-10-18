"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  type ProjectMember,
  type ProjectMemberPermissions,
  ProjectRole,
} from "@/features/project/types/project";
import { Avatar } from "../ui/avatar-stack";
import InviteMemberDialog from "../dialogs/invite-member-dialog";
import MemberPermissionsDialog from "../dialogs/member-permissions-dialog";
import PendingInvitationsList from "./pending-invitations-list";
import { usePendingProjectInvitations } from "@/features/project/hooks/use-invitations";
import {
  useRemoveProjectMember,
  useUpdateProjectMemberPermissions,
} from "@/features/project/hooks/use-project-members";
import { useProjectConfirmDialog } from "@/features/project/hooks/use-project-confirm-dialog";
import { ProjectConfirmDialog } from "../ui/project-confirm-dialog";
import {
  ChevronRight,
  Settings2,
  Star,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const ROLE_CONFIG: Record<
  ProjectRole,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [ProjectRole.ADMIN]: {
    label: "Project Owner",
    color: "text-warning-content",
    bg: "bg-warning-soft",
    icon: Star,
  },
  [ProjectRole.MEMBER]: {
    label: "Member",
    color: "text-muted-foreground",
    bg: "bg-muted",
    icon: User,
  },
};

export default function ProjectMembersPanel({
  projectId,
  members,
  canInvite = false,
  canRemoveMembers = false,
  canManagePermissions = false,
  onViewAll,
}: {
  projectId: string;
  members: ProjectMember[];
  canInvite?: boolean;
  canRemoveMembers?: boolean;
  canManagePermissions?: boolean;
  onViewAll?: () => void;
}) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [permissionMember, setPermissionMember] =
    useState<ProjectMember | null>(null);
  const { dialogProps, confirm } = useProjectConfirmDialog();
  const removeMemberMutation = useRemoveProjectMember(projectId);
  const updatePermissionsMutation =
    useUpdateProjectMemberPermissions(projectId);
  const pendingInvitationsQuery = usePendingProjectInvitations(
    projectId,
    canInvite,
  );
  const pendingInvitations = pendingInvitationsQuery.data ?? [];

  const sorted = [...members].sort((a, b) => {
    const order = { ADMIN: 0, MEMBER: 1 };
    return order[a.role] - order[b.role];
  });

  const handleRemoveMember = (member: ProjectMember) => {
    confirm({
      title: `Remove ${member.displayName}`,
      description: "Are you sure you want to remove this member from the project? They will lose access immediately.",
      confirmLabel: "Remove Member",
      cancelLabel: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await removeMemberMutation.mutateAsync(member.userId);
          toast.success("Member removed from project");
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to remove member",
          );
        }
      },
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
      toast.success("Member permissions updated");
      setPermissionMember(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update member permissions",
      );
    }
  };

  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Project Members ({members.length})
          </h3>
          {pendingInvitations.length > 0 && (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-content">
              {pendingInvitations.length} pending
            </span>
          )}
        </div>
        {canInvite && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowInviteDialog(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-semibold text-info-content transition hover:bg-info-soft hover:text-info-content cursor-pointer"
          >
            <UserPlus className="h-3 w-3" strokeWidth={2.5} />
            Invite
          </Button>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        {sorted.map((member) => {
          const roleCfg = ROLE_CONFIG[member.role];
          const RoleIcon = roleCfg.icon;
          return (
            <div
              key={member.id}
              className="group flex items-center gap-3 rounded-panel px-2 py-2 transition hover:bg-background"
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
                <p className="truncate text-sm font-semibold text-foreground">
                  {member.displayName}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${roleCfg.color}`}
                >
                  <RoleIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
                  {roleCfg.label}
                </span>
              </div>
              {member.role !== ProjectRole.ADMIN && (
                <div className="flex shrink-0 items-center">
                  {canManagePermissions && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPermissionMember(member)}
                      className="h-8 w-8 cursor-pointer rounded-control text-muted-foreground opacity-0 transition hover:bg-info-soft hover:text-info-content group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                      aria-label={`Manage permissions for ${member.displayName}`}
                      title="Manage permissions"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canRemoveMembers && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member)}
                      disabled={removeMemberMutation.isPending}
                      className="h-8 w-8 cursor-pointer rounded-control text-muted-foreground opacity-0 transition hover:bg-destructive-soft hover:text-destructive-content group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 disabled:opacity-40"
                      aria-label={`Remove member ${member.displayName}`}
                      title="Remove member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {pendingInvitationsQuery.isLoading && canInvite && (
        <div
          className="mt-4 space-y-2 border-t border-border pt-4"
          aria-label="Loading invitations"
        >
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-14 animate-pulse rounded-panel bg-background" />
        </div>
      )}
      <PendingInvitationsList
        projectId={projectId}
        invitations={pendingInvitations}
      />
      {onViewAll && (
        <Button
          type="button"
          variant="outline"
          onClick={onViewAll}
          className="mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-control border border-border bg-background py-2 text-xs font-semibold text-foreground transition hover:bg-muted hover:text-foreground"
        >
          <span>View all members</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
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
      <ProjectConfirmDialog {...dialogProps} />
    </div>
  );
}

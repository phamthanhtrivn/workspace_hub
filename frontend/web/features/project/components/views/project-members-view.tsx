"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Calendar,
  Clock3,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  Trash2,
  User,
  Users,
} from "lucide-react";
import {
  type ProjectMember,
  type ProjectMemberPermissions,
  ProjectRole,
  type Task,
} from "@/features/project/types/project";
import { Avatar } from "../ui/avatar-stack";
import MemberPermissionsDialog from "../dialogs/member-permissions-dialog";
import PendingInvitationsList from "../members/pending-invitations-list";
import { usePendingProjectInvitations } from "@/features/project/hooks/use-invitations";
import {
  useRemoveProjectMember,
  useUpdateProjectMemberPermissions,
} from "@/features/project/hooks/use-project-members";
import { useProjectConfirmDialog } from "@/features/project/hooks/use-project-confirm-dialog";
import { ProjectConfirmDialog } from "../ui/project-confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface ProjectMembersViewProps {
  projectId: string;
  members: ProjectMember[];
  tasks: Task[];
  canInvite?: boolean;
  canRemoveMembers?: boolean;
  canManagePermissions?: boolean;
  currentUserId?: string;
  onInviteClick?: () => void;
}

type RoleFilterTab = "ALL" | "ADMIN" | "MEMBER" | "PENDING";

export default function ProjectMembersView({
  projectId,
  members,
  tasks,
  canInvite = false,
  canRemoveMembers = false,
  canManagePermissions = false,
  currentUserId,
}: ProjectMembersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<RoleFilterTab>("ALL");
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

  // Count active tasks assigned to each member
  const tasksByMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      if (task.archived) continue;
      for (const assignee of task.assignees) {
        map.set(assignee.userId, (map.get(assignee.userId) ?? 0) + 1);
      }
    }
    return map;
  }, [tasks]);

  const ownerCount = useMemo(
    () => members.filter((m) => m.role === ProjectRole.ADMIN).length,
    [members],
  );

  const regularMemberCount = useMemo(
    () => members.filter((m) => m.role === ProjectRole.MEMBER).length,
    [members],
  );

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    return members
      .filter((member) => {
        // Tab filter
        if (activeTab === "ADMIN" && member.role !== ProjectRole.ADMIN)
          return false;
        if (activeTab === "MEMBER" && member.role !== ProjectRole.MEMBER)
          return false;

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          return member.displayName.toLowerCase().includes(query);
        }
        return true;
      })
      .sort((a, b) => {
        const order = { ADMIN: 0, MEMBER: 1 };
        return order[a.role] - order[b.role];
      });
  }, [members, activeTab, searchQuery]);

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

  const formatJoinDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  return (
    <div className="min-w-0 space-y-4 pb-4">
      {/* ── 1. Top Summary Metric Cards ── */}
      <div className="grid grid-cols-1 gap-4 @min-[640px]/project-detail:grid-cols-3">
        {/* Total Members */}
        <div className="flex items-center gap-4 rounded-panel border border-border bg-card p-4 transition">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-panel bg-info-soft text-info-content">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground">
              Total Members
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground">
                {members.length}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                active members
              </span>
            </div>
          </div>
        </div>

        {/* Owners & Admins */}
        <div className="flex items-center gap-4 rounded-panel border border-border bg-card p-4 transition">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-panel bg-warning-soft text-warning-content">
            <Star className="h-6 w-6 fill-warning-content text-warning-content" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground">
              Project Owners
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground">
                {ownerCount}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                owners
              </span>
            </div>
          </div>
        </div>

        {/* Pending Invites */}
        <div className="flex items-center gap-4 rounded-panel border border-border bg-card p-4 transition">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-panel bg-muted text-muted-foreground">
            <Clock3 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground">
              Pending Invitations
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground">
                {pendingInvitations.length}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {pendingInvitations.length > 0
                  ? "awaiting response"
                  : "no pending invites"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Filters & Action Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab buttons */}
          <div className="inline-flex max-w-full flex-wrap gap-y-1 rounded-lg border border-border bg-background p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("ALL")}
              className={`h-7 cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTab === "ALL"
                  ? "bg-card text-foreground hover:bg-card hover:text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Members ({members.length})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("ADMIN")}
              className={`h-7 cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTab === "ADMIN"
                  ? "bg-card text-foreground hover:bg-card hover:text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Owners ({ownerCount})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("MEMBER")}
              className={`h-7 cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTab === "MEMBER"
                  ? "bg-card text-foreground hover:bg-card hover:text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Members ({regularMemberCount})
            </Button>
            {pendingInvitations.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("PENDING")}
                className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                  activeTab === "PENDING"
                    ? "bg-card text-warning-content hover:bg-card hover:text-warning-content"
                    : "text-warning-content hover:text-warning-content"
                }`}
              >
                <span>Pending ({pendingInvitations.length})</span>
                <span className="flex h-2 w-2 rounded-full bg-warning-content" />
              </Button>
            )}
          </div>
        </div>

        {/* Search box */}
        {activeTab !== "PENDING" && (
          <div className="relative min-w-0 w-full @min-[800px]/project-detail:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="h-9 w-full rounded-control border-input bg-card pl-9 pr-3 text-xs font-medium text-foreground"
            />
          </div>
        )}
      </div>

      {/* ── 3. Main Content: Members Table or Pending Invites Tab ── */}
      {activeTab === "PENDING" ? (
        <div className="rounded-panel border border-border bg-card p-6">
          <PendingInvitationsList
            projectId={projectId}
            invitations={pendingInvitations}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-panel border border-border bg-card">
          {filteredMembers.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">
                No members found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table unstyled className="w-full min-w-[760px] table-fixed border-collapse text-left [&_td]:break-words">
                <TableHeader unstyled>
                  <TableRow unstyled className="border-b border-border bg-background text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <TableHead unstyled className="px-6 py-3.5">Member</TableHead>
                    <TableHead unstyled className="px-4 py-3.5">Role</TableHead>
                    <TableHead unstyled className="px-4 py-3.5">Tasks</TableHead>
                    <TableHead unstyled className="px-4 py-3.5">Joined</TableHead>
                    <TableHead unstyled className="px-4 py-3.5">Permissions</TableHead>
                    <TableHead unstyled className="px-6 py-3.5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody unstyled className="divide-y divide-border text-xs">
                  {filteredMembers.map((member) => {
                    const isOwner = member.role === ProjectRole.ADMIN;
                    const isCurrent = member.userId === currentUserId;
                    const assignedCount = tasksByMember.get(member.userId) ?? 0;

                    return (
                      <TableRow unstyled
                        key={member.id}
                        className="transition hover:bg-background"
                      >
                        {/* Member Name & Avatar */}
                        <TableCell unstyled className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              user={{
                                userId: member.userId,
                                displayName: member.displayName,
                                avatarUrl: member.avatarUrl,
                              }}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  {member.displayName}
                                </span>
                                {isCurrent && (
                                  <span className="rounded-full border border-border bg-info-soft px-1.5 py-0.2 text-xs font-semibold text-info-content">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role Badge */}
                        <TableCell unstyled className="px-4 py-4 whitespace-nowrap">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-content">
                              <Star className="h-3 w-3 fill-warning-content text-warning-content" />
                              Project Owner
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                              <User className="h-3 w-3 text-muted-foreground" />
                              Member
                            </span>
                          )}
                        </TableCell>

                        {/* Tasks Assigned */}
                        <TableCell unstyled className="px-4 py-4 whitespace-nowrap">
                          {assignedCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 font-semibold text-foreground">
                              <Briefcase className="h-3 w-3 text-info-content" />
                              {assignedCount} tasks
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              No tasks assigned
                            </span>
                          )}
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell unstyled className="px-4 py-4 whitespace-nowrap text-muted-foreground font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatJoinDate(member.joinedAt)}
                          </span>
                        </TableCell>

                        {/* Permissions Summary */}
                        <TableCell unstyled className="px-4 py-4">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 rounded border border-border bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-content">
                              <ShieldCheck className="h-3 w-3 text-success-content" />
                              Full Access
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {member.canCreateTask && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                  Create Tasks
                                </span>
                              )}
                              {member.canManageMembers && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                  Manage Members
                                </span>
                              )}
                              {member.canEditDocuments && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                  Edit Documents
                                </span>
                              )}
                              {!member.canCreateTask &&
                                !member.canManageMembers &&
                                !member.canEditDocuments && (
                                  <span className="text-xs text-muted-foreground">
                                    Standard permissions
                                  </span>
                                )}
                            </div>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell unstyled className="px-6 py-4 text-right whitespace-nowrap">
                          {isOwner ? (
                            <span className="text-xs font-semibold text-muted-foreground">
                              Owner
                            </span>
                          ) : (
                            <div className="inline-flex flex-wrap items-center justify-end gap-2">
                              {canManagePermissions && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPermissionMember(member)}
                                  className="h-8 gap-1 rounded-control px-2.5 text-xs font-semibold text-foreground hover:border-primary hover:bg-info-soft hover:text-info-content"
                                  title={`Edit permissions for ${member.displayName}`}
                                >
                                  <Settings2 className="h-3.5 w-3.5" />
                                  <span>Permissions</span>
                                </Button>
                              )}

                              {canRemoveMembers && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member)}
                                  disabled={removeMemberMutation.isPending}
                                  className="h-8 gap-1 rounded-control px-2.5 text-xs font-semibold text-muted-foreground hover:border-border hover:bg-destructive-soft hover:text-destructive-content disabled:opacity-50"
                                  title={`Remove ${member.displayName}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Remove</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Dialogs ── */}
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

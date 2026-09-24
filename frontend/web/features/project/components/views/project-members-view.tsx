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
    <div className="space-y-6 pb-12">
      {/* ── 1. Top Summary Metric Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Members */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#0052CC]">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">
              Total Members
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {members.length}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                active members
              </span>
            </div>
          </div>
        </div>

        {/* Owners & Admins */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Star className="h-6 w-6 fill-amber-400 text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">
              Project Owners
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {ownerCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                owners
              </span>
            </div>
          </div>
        </div>

        {/* Pending Invites */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <Clock3 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">
              Pending Invitations
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {pendingInvitations.length}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {pendingInvitations.length > 0
                  ? "awaiting response"
                  : "no pending invites"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Filters & Action Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab buttons */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/70 p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("ALL")}
              className={`h-7 cursor-pointer rounded-md px-3 py-1 text-xs font-bold transition ${
                activeTab === "ALL"
                  ? "bg-white text-slate-800 shadow-xs hover:bg-white hover:text-slate-800"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All Members ({members.length})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("ADMIN")}
              className={`h-7 cursor-pointer rounded-md px-3 py-1 text-xs font-bold transition ${
                activeTab === "ADMIN"
                  ? "bg-white text-slate-800 shadow-xs hover:bg-white hover:text-slate-800"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Owners ({ownerCount})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("MEMBER")}
              className={`h-7 cursor-pointer rounded-md px-3 py-1 text-xs font-bold transition ${
                activeTab === "MEMBER"
                  ? "bg-white text-slate-800 shadow-xs hover:bg-white hover:text-slate-800"
                  : "text-slate-500 hover:text-slate-900"
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
                className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition ${
                  activeTab === "PENDING"
                    ? "bg-white text-amber-700 shadow-xs hover:bg-white hover:text-amber-700"
                    : "text-amber-600 hover:text-amber-800"
                }`}
              >
                <span>Pending ({pendingInvitations.length})</span>
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
              </Button>
            )}
          </div>
        </div>

        {/* Search box */}
        {activeTab !== "PENDING" && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="h-9 w-full rounded-lg border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-800"
            />
          </div>
        )}
      </div>

      {/* ── 3. Main Content: Members Table or Pending Invites Tab ── */}
      {activeTab === "PENDING" ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <PendingInvitationsList
            projectId={projectId}
            invitations={pendingInvitations}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
          {filteredMembers.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600">
                No members found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3.5">Member</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Tasks</th>
                    <th className="px-4 py-3.5">Joined</th>
                    <th className="px-4 py-3.5">Permissions</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMembers.map((member) => {
                    const isOwner = member.role === ProjectRole.ADMIN;
                    const isCurrent = member.userId === currentUserId;
                    const assignedCount = tasksByMember.get(member.userId) ?? 0;

                    return (
                      <tr
                        key={member.id}
                        className="transition hover:bg-slate-50/60"
                      >
                        {/* Member Name & Avatar */}
                        <td className="px-6 py-4">
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
                                <span className="font-bold text-slate-900">
                                  {member.displayName}
                                </span>
                                {isCurrent && (
                                  <span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-600" />
                              Project Owner
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              <User className="h-3 w-3 text-slate-500" />
                              Member
                            </span>
                          )}
                        </td>

                        {/* Tasks Assigned */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {assignedCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">
                              <Briefcase className="h-3 w-3 text-[#0052CC]" />
                              {assignedCount} tasks
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              No tasks assigned
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="px-4 py-4 whitespace-nowrap text-slate-500 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatJoinDate(member.joinedAt)}
                          </span>
                        </td>

                        {/* Permissions Summary */}
                        <td className="px-4 py-4">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 rounded border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              Full Access
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {member.canCreateTask && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                  Create Tasks
                                </span>
                              )}
                              {member.canManageMembers && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                  Manage Members
                                </span>
                              )}
                              {member.canEditDocuments && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                  Edit Documents
                                </span>
                              )}
                              {!member.canCreateTask &&
                                !member.canManageMembers &&
                                !member.canEditDocuments && (
                                  <span className="text-[11px] text-slate-400">
                                    Standard permissions
                                  </span>
                                )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {isOwner ? (
                            <span className="text-[11px] font-semibold text-slate-400">
                              Owner
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              {canManagePermissions && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPermissionMember(member)}
                                  className="h-8 gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-700 hover:border-[#0052CC] hover:bg-blue-50 hover:text-[#0052CC]"
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
                                  className="h-8 gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                  title={`Remove ${member.displayName}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Remove</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

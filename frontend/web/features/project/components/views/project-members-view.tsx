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
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { confirmProjectAction } from "@/features/project/project-alert";
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
  const intl = useAppIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<RoleFilterTab>("ALL");
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

  const handleRemoveMember = async (member: ProjectMember) => {
    const confirmed = await confirmProjectAction({
      title: intl.formatMessage(
        { id: "project.member.removeConfirmTitle" },
        { name: member.displayName },
      ),
      text: intl.formatMessage({ id: "project.member.removeConfirmText" }),
      confirmText: intl.formatMessage({ id: "project.member.remove" }),
      cancelText: intl.formatMessage({ id: "app.cancel" }),
      icon: "warning",
      destructive: true,
    });
    if (!confirmed) return;

    removeMemberMutation.mutate(member.userId, {
      onSuccess: () =>
        toast.success(intl.formatMessage({ id: "project.member.removed" })),
      onError: (error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : intl.formatMessage({ id: "project.member.removeFailed" }),
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
      toast.success(intl.formatMessage({ id: "project.permission.updated" }));
      setPermissionMember(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : intl.formatMessage({ id: "project.permission.updateFailed" }),
      );
    }
  };

  const formatJoinDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      return intl.formatDate(date, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. Top Summary Metric Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Members */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#0052CC]">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">
              {intl.formatMessage({ id: "project.members.total" })}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {members.length}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {intl.formatMessage({ id: "project.members.activeMembers" })}
              </span>
            </div>
          </div>
        </div>

        {/* Owners & Admins */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Star className="h-6 w-6 fill-amber-400 text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">
              {intl.formatMessage({ id: "project.members.owners" })}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {ownerCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {intl.formatMessage({ id: "project.role.owner" })}
              </span>
            </div>
          </div>
        </div>

        {/* Pending Invites */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <Clock3 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">
              {intl.formatMessage({ id: "project.members.pending" })}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {pendingInvitations.length}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {pendingInvitations.length > 0
                  ? intl.formatMessage({
                      id: "project.members.pendingSubtitle",
                    })
                  : intl.formatMessage({ id: "project.members.noPending" })}
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
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "ALL"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {intl.formatMessage({ id: "project.members.filterAll" })} (
              {members.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ADMIN")}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "ADMIN"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {intl.formatMessage({ id: "project.members.filterOwners" })} (
              {ownerCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("MEMBER")}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "MEMBER"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {intl.formatMessage({ id: "project.members.filterMembers" })} (
              {regularMemberCount})
            </button>
            {pendingInvitations.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("PENDING")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "PENDING"
                    ? "bg-white text-amber-700 shadow-sm"
                    : "text-amber-600 hover:text-amber-800"
                }`}
              >
                <span>
                  {intl.formatMessage(
                    { id: "project.members.filterPending" },
                    { count: pendingInvitations.length },
                  )}
                </span>
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
              </button>
            )}
          </div>
        </div>

        {/* Search box */}
        {activeTab !== "PENDING" && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={intl.formatMessage({
                id: "project.members.searchPlaceholder",
              })}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
            />
          </div>
        )}
      </div>

      {/* ── 3. Main Content: Members Table or Pending Invites Tab ── */}
      {activeTab === "PENDING" ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <PendingInvitationsList
            projectId={projectId}
            invitations={pendingInvitations}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          {filteredMembers.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600">
                {intl.formatMessage({ id: "project.members.noResults" })}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3.5">
                      {intl.formatMessage({ id: "project.members.colMember" })}
                    </th>
                    <th className="px-4 py-3.5">
                      {intl.formatMessage({ id: "project.members.colRole" })}
                    </th>
                    <th className="px-4 py-3.5">
                      {intl.formatMessage({ id: "project.members.colTasks" })}
                    </th>
                    <th className="px-4 py-3.5">
                      {intl.formatMessage({ id: "project.members.colJoined" })}
                    </th>
                    <th className="px-4 py-3.5">
                      {intl.formatMessage({
                        id: "project.members.colPermissions",
                      })}
                    </th>
                    <th className="px-6 py-3.5 text-right">
                      {intl.formatMessage({ id: "project.members.colActions" })}
                    </th>
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
                                    {intl.formatMessage({
                                      id: "project.members.you",
                                    })}
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
                              {intl.formatMessage({
                                id: "project.members.ownerBadge",
                              })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              <User className="h-3 w-3 text-slate-500" />
                              {intl.formatMessage({
                                id: "project.members.memberBadge",
                              })}
                            </span>
                          )}
                        </td>

                        {/* Tasks Assigned */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {assignedCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">
                              <Briefcase className="h-3 w-3 text-[#0052CC]" />
                              {intl.formatMessage(
                                { id: "project.members.tasksCount" },
                                { count: assignedCount },
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {intl.formatMessage({
                                id: "project.members.noTasks",
                              })}
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
                              {intl.formatMessage({
                                id: "project.members.fullPermissions",
                              })}
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {member.canCreateTask && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {intl.formatMessage({
                                    id: "project.permission.createTask",
                                  })}
                                </span>
                              )}
                              {member.canManageMembers && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {intl.formatMessage({
                                    id: "project.permission.manageMembers",
                                  })}
                                </span>
                              )}
                              {!member.canCreateTask &&
                                !member.canManageMembers && (
                                  <span className="text-[11px] text-slate-400">
                                    {intl.formatMessage({
                                      id: "project.permission.included",
                                    })}
                                  </span>
                                )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {isOwner ? (
                            <span className="text-[11px] font-semibold text-slate-400">
                              {intl.formatMessage({
                                id: "project.role.owner",
                              })}
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              {canManagePermissions && (
                                <button
                                  type="button"
                                  onClick={() => setPermissionMember(member)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#0052CC] hover:bg-blue-50 hover:text-[#0052CC]"
                                  title={intl.formatMessage(
                                    { id: "project.permission.manageFor" },
                                    { name: member.displayName },
                                  )}
                                >
                                  <Settings2 className="h-3.5 w-3.5" />
                                  <span>
                                    {intl.formatMessage({
                                      id: "project.members.editPermissions",
                                    })}
                                  </span>
                                </button>
                              )}

                              {canRemoveMembers && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleRemoveMember(member)
                                  }
                                  disabled={removeMemberMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                  title={intl.formatMessage(
                                    { id: "project.member.removeFor" },
                                    { name: member.displayName },
                                  )}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>
                                    {intl.formatMessage({
                                      id: "project.member.remove",
                                    })}
                                  </span>
                                </button>
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
    </div>
  );
}

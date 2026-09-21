"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Info,
  ListChecks,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Avatar } from "@/features/project/components/ui/avatar-stack";
import type {
  ProjectMember,
  ProjectMemberPermissions,
} from "@/features/project/types/project";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomCheckbox } from "@/components/ui/custom/custom-checkbox";
import { Badge } from "@/components/ui/badge";

interface PermissionOption {
  key: keyof ProjectMemberPermissions;
  label: string;
  description: string;
}

const TASK_PERMISSION_OPTIONS: PermissionOption[] = [
  {
    key: "canCreateTask",
    label: "Create tasks",
    description: "Allow creating new tasks in this project.",
  },
  {
    key: "canEditOwnTask",
    label: "Edit own tasks",
    description: "Allow editing tasks created by or assigned to this member.",
  },
  {
    key: "canEditOthersTask",
    label: "Edit other members' tasks",
    description: "Allow modifying tasks created by other project members.",
  },
];

const MANAGEMENT_PERMISSION_OPTIONS: PermissionOption[] = [
  {
    key: "canManageMembers",
    label: "Manage members & permissions",
    description: "Invite new members, change member roles and remove members.",
  },
  {
    key: "canManageLabels",
    label: "Manage project labels",
    description: "Create, edit, and delete custom project labels.",
  },
];

const DEFAULT_CAPABILITIES = [
  {
    title: "View Project & Tasks",
    description: "Access project overview, board, list, timeline, and calendar views.",
  },
  {
    title: "Comments & Checklists",
    description: "Post comments and check off assigned checklist items.",
  },
];

function getMemberPermissions(member: ProjectMember): ProjectMemberPermissions {
  return {
    canCreateTask: member.canCreateTask,
    canEditOwnTask: member.canEditOwnTask,
    canEditOthersTask: member.canEditOthersTask,
    canManageMembers: member.canManageMembers,
    canManageLabels: member.canManageLabels,
  };
}

export default function MemberPermissionsDialog({
  member,
  open,
  isSaving = false,
  onClose,
  onSave,
}: {
  member: ProjectMember | null;
  open: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (permissions: ProjectMemberPermissions) => Promise<void>;
}) {
  const [permissions, setPermissions] =
    useState<ProjectMemberPermissions | null>(
      member ? getMemberPermissions(member) : null,
    );

  if (!open || !member || !permissions) return null;

  const enabledCount = Object.values(permissions).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isSaving && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 text-left border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Avatar
              user={{
                userId: member.userId,
                displayName: member.displayName,
                avatarUrl: member.avatarUrl,
              }}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#0052CC]" />
                <DialogTitle className="truncate text-lg font-bold text-slate-900">
                  Permissions: {member.displayName}
                </DialogTitle>
              </div>
              <DialogDescription className="mt-1 text-xs text-slate-500">
                Configure member access privileges for this project.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5 max-h-[calc(100dvh-16rem)] space-y-4">
          <section
            aria-labelledby="default-member-rights"
            className="rounded-xl border border-blue-100 bg-blue-50/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id="default-member-rights"
                  className="text-xs font-bold text-[#172B4D]"
                >
                  Standard Member Access
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Included for all project members automatically.
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-100/70 text-[10px] font-bold text-blue-700"
              >
                Included
              </Badge>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {DEFAULT_CAPABILITIES.map((capability) => (
                <div key={capability.title} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0052CC]" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      {capability.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                      {capability.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-end justify-between gap-4 pt-1">
            <div>
              <h3 className="text-xs font-bold text-[#172B4D]">
                Additional Permissions
              </h3>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                Grant specific write and management capabilities.
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-slate-500">
              {enabledCount} of 5 active
            </span>
          </div>

          {[
            {
              id: "task-permissions",
              icon: ListChecks,
              title: "Task Management",
              description: "Permissions related to creating and updating tasks.",
              options: TASK_PERMISSION_OPTIONS,
            },
            {
              id: "management-permissions",
              icon: Settings2,
              title: "Project Administration",
              description: "Permissions for managing project members and labels.",
              options: MANAGEMENT_PERMISSION_OPTIONS,
            },
          ].map((group) => {
            const GroupIcon = group.icon;
            return (
              <fieldset
                key={group.id}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
                <legend className="sr-only">{group.title}</legend>
                <div className="flex items-start gap-2.5 bg-slate-50 px-4 py-2.5">
                  <GroupIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      {group.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                      {group.description}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.options.map((option) => (
                    <CustomCheckbox
                      key={option.key}
                      checked={permissions[option.key]}
                      onCheckedChange={(checked) =>
                        setPermissions((current) =>
                          current
                            ? {
                                ...current,
                                [option.key]: Boolean(checked),
                              }
                            : current,
                        )
                      }
                      label={option.label}
                      description={option.description}
                      className="bg-white px-4 py-3 transition hover:bg-blue-50/40"
                      checkboxClassName="mt-0.5 cursor-pointer data-[state=checked]:bg-[#0052CC] data-[state=checked]:border-[#0052CC]"
                    />
                  ))}
                </div>
              </fieldset>
            );
          })}

          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 border border-amber-200/60">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[11px] leading-relaxed">
              Task creators always retain permission to edit tasks they originally created.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="cursor-pointer rounded-xl font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onSave(permissions)}
            disabled={isSaving}
            className="cursor-pointer rounded-xl bg-[#0052CC] font-bold text-white shadow-sm hover:bg-[#0747A6] disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

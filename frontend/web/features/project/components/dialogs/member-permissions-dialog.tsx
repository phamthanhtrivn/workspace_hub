"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Info,
  ListChecks,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { Avatar } from "@/features/project/components/ui/avatar-stack";
import type {
  ProjectMember,
  ProjectMemberPermissions,
} from "@/features/project/types/project";

interface PermissionOption {
  key: keyof ProjectMemberPermissions;
  labelId: string;
  descriptionId: string;
}

const TASK_PERMISSION_OPTIONS: PermissionOption[] = [
  {
    key: "canCreateTask",
    labelId: "project.permission.createTask",
    descriptionId: "project.permission.createTaskDescription",
  },
  {
    key: "canEditOwnTask",
    labelId: "project.permission.editOwnTask",
    descriptionId: "project.permission.editOwnTaskDescription",
  },
  {
    key: "canEditOthersTask",
    labelId: "project.permission.editOthersTask",
    descriptionId: "project.permission.editOthersTaskDescription",
  },
];

const MANAGEMENT_PERMISSION_OPTIONS: PermissionOption[] = [
  {
    key: "canManageSprints",
    labelId: "project.permission.manageSprints",
    descriptionId: "project.permission.manageSprintsDescription",
  },
  {
    key: "canManageMembers",
    labelId: "project.permission.manageMembers",
    descriptionId: "project.permission.manageMembersDescription",
  },
  {
    key: "canManageLabels",
    labelId: "project.permission.manageLabels",
    descriptionId: "project.permission.manageLabelsDescription",
  },
];

const DEFAULT_CAPABILITIES = [
  {
    titleId: "project.permission.baseAccess",
    descriptionId: "project.permission.baseAccessDescription",
  },
  {
    titleId: "project.permission.assignedAccess",
    descriptionId: "project.permission.assignedAccessDescription",
  },
];

function getMemberPermissions(member: ProjectMember): ProjectMemberPermissions {
  return {
    canCreateTask: member.canCreateTask,
    canEditOwnTask: member.canEditOwnTask,
    canEditOthersTask: member.canEditOthersTask,
    canManageSprints: member.canManageSprints,
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
  const intl = useAppIntl();
  const [permissions, setPermissions] =
    useState<ProjectMemberPermissions | null>(
      member ? getMemberPermissions(member) : null,
    );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose, open]);

  if (!open || !member || !permissions) return null;

  const enabledCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-permissions-title"
        aria-describedby="member-permissions-description"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(9,30,66,0.24)]"
      >
        <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-center gap-3">
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
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
                <h2
                  id="member-permissions-title"
                  className="truncate text-lg font-black text-[#172B4D]"
                >
                  {intl.formatMessage(
                    { id: "project.permission.title" },
                    { name: member.displayName },
                  )}
                </h2>
              </div>
              <p
                id="member-permissions-description"
                className="mt-1 text-xs font-medium leading-5 text-slate-500"
              >
                {intl.formatMessage({ id: "project.permission.ownerOnly" })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:translate-y-px disabled:opacity-50"
            aria-label={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="overflow-y-auto px-5 pb-5 sm:px-6">
          <section
            aria-labelledby="default-member-rights"
            className="rounded-xl border border-blue-100 bg-blue-50/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id="default-member-rights"
                  className="text-sm font-black text-[#172B4D]"
                >
                  {intl.formatMessage({ id: "project.permission.alwaysAvailable" })}
                </h3>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">
                  {intl.formatMessage({ id: "project.permission.alwaysAvailableHint" })}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-blue-700">
                {intl.formatMessage({ id: "project.permission.included" })}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {DEFAULT_CAPABILITIES.map((capability) => (
                <div key={capability.titleId} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      {intl.formatMessage({ id: capability.titleId })}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-600">
                      {intl.formatMessage({ id: capability.descriptionId })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 border-t border-blue-100 pt-3 text-[11px] font-medium leading-4 text-slate-500">
              {intl.formatMessage({ id: "project.permission.closedReadOnly" })}
            </p>
          </section>

          <div className="mb-3 mt-5 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-[#172B4D]">
                {intl.formatMessage({ id: "project.permission.additional" })}
              </h3>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                {intl.formatMessage({ id: "project.permission.additionalDescription" })}
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-slate-500">
              {intl.formatMessage(
                { id: "project.permission.enabledCount" },
                { count: enabledCount, total: 6 },
              )}
            </span>
          </div>

          {[
            {
              id: "task-permissions",
              icon: ListChecks,
              titleId: "project.permission.taskGroup",
              descriptionId: "project.permission.taskGroupDescription",
              options: TASK_PERMISSION_OPTIONS,
            },
            {
              id: "management-permissions",
              icon: Settings2,
              titleId: "project.permission.managementGroup",
              descriptionId: "project.permission.managementGroupDescription",
              options: MANAGEMENT_PERMISSION_OPTIONS,
            },
          ].map((group) => {
            const GroupIcon = group.icon;
            return (
              <fieldset
                key={group.id}
                className="mt-3 overflow-hidden rounded-xl border border-slate-200"
              >
                <legend className="sr-only">
                  {intl.formatMessage({ id: group.titleId })}
                </legend>
                <div className="flex items-start gap-2.5 bg-slate-50 px-4 py-3">
                  <GroupIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs font-black text-slate-700">
                      {intl.formatMessage({ id: group.titleId })}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                      {intl.formatMessage({ id: group.descriptionId })}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.options.map((option) => (
                    <label
                      key={option.key}
                      className="flex cursor-pointer items-start gap-3 bg-white px-4 py-3 transition hover:bg-blue-50/40"
                    >
                      <input
                        type="checkbox"
                        checked={permissions[option.key]}
                        onChange={(event) =>
                          setPermissions((current) =>
                            current
                              ? {
                                  ...current,
                                  [option.key]: event.target.checked,
                                }
                              : current,
                          )
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                      />
                      <span>
                        <span className="block text-sm font-bold text-slate-700">
                          {intl.formatMessage({ id: option.labelId })}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                          {intl.formatMessage({ id: option.descriptionId })}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{intl.formatMessage({ id: "project.permission.creatorRule" })}</p>
          </div>
        </main>

        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:translate-y-px disabled:opacity-50"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="button"
            onClick={() => void onSave(permissions)}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {intl.formatMessage({
              id: isSaving ? "app.saving" : "project.permission.save",
            })}
          </button>
        </footer>
      </div>
    </div>
  );
}

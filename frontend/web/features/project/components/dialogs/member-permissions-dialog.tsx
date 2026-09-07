"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type {
  ProjectMember,
  ProjectMemberPermissions,
} from "@/features/project/types/project";

const PERMISSION_OPTIONS: Array<{
  key: keyof ProjectMemberPermissions;
  labelId: string;
  descriptionId: string;
}> = [
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

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-permissions-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="member-permissions-title"
                className="text-lg font-black text-[#172B4D]"
              >
                {intl.formatMessage(
                  { id: "project.permission.title" },
                  { name: member.displayName },
                )}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {intl.formatMessage({ id: "project.permission.ownerOnly" })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
            aria-label={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {PERMISSION_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <input
                type="checkbox"
                checked={permissions[option.key]}
                onChange={(event) =>
                  setPermissions((current) =>
                    current
                      ? { ...current, [option.key]: event.target.checked }
                      : current,
                  )
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-600"
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

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="button"
            onClick={() => void onSave(permissions)}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {intl.formatMessage({
              id: isSaving ? "app.saving" : "project.permission.save",
            })}
          </button>
        </div>
      </div>
    </div>
  );
}

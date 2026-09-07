"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import type {
  ProjectMember,
  ProjectMemberPermissions,
} from "@/features/project/types/project";

const PERMISSION_OPTIONS: Array<{
  key: keyof ProjectMemberPermissions;
  label: string;
  description: string;
}> = [
  {
    key: "canCreateTask",
    label: "Tạo công việc",
    description: "Cho phép tạo công việc và công việc con trong project.",
  },
  {
    key: "canEditOwnTask",
    label: "Chỉnh sửa công việc của mình",
    description: "Cho phép cập nhật những công việc do thành viên này tạo.",
  },
  {
    key: "canEditOthersTask",
    label: "Chỉnh sửa công việc của người khác",
    description:
      "Cho phép cập nhật, di chuyển công việc do thành viên khác tạo.",
  },
  {
    key: "canManageSprints",
    label: "Quản lý sprint",
    description: "Cho phép tạo, cập nhật, bắt đầu và hoàn thành sprint.",
  },
  {
    key: "canManageMembers",
    label: "Quản lý thành viên",
    description:
      "Cho phép mời hoặc xóa thành viên, nhưng không được cấp quyền.",
  },
  {
    key: "canManageLabels",
    label: "Quản lý nhãn",
    description: "Cho phép tạo, cập nhật và xóa nhãn của project.",
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
                Quyền của {member.displayName}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Chỉ Owner có thể thay đổi các quyền này.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
            aria-label="Đóng"
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
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  {option.description}
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
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void onSave(permissions)}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Đang lưu..." : "Lưu quyền"}
          </button>
        </div>
      </div>
    </div>
  );
}

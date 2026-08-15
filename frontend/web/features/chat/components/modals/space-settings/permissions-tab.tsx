import type { ReactNode } from "react";
import { Hash, Trash2 } from "lucide-react";
import { SpaceSettingResponse } from "../../../types/chat.types";

interface PermissionsTabProps {
  isAdmin: boolean;
  isSaving: boolean;
  setting: SpaceSettingResponse;
  onChange: (setting: Partial<SpaceSettingResponse>) => void;
}

export function PermissionsTab({
  isAdmin,
  isSaving,
  setting,
  onChange,
}: PermissionsTabProps) {
  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
      <PermissionItem
        title="Members can create channels"
        description="Allow regular members to create new channels in this space."
        checked={setting.allowMemberCreateChannel}
        disabled={!isAdmin || isSaving}
        icon={<Hash size={17} />}
        onToggle={() =>
          onChange({
            ...setting,
            allowMemberCreateChannel: !setting.allowMemberCreateChannel,
          })
        }
      />
      <PermissionItem
        title="Members can delete own channels"
        description="Allow regular members to delete non-default channels they created."
        checked={setting.allowMemberDeleteOwnChannel}
        disabled={!isAdmin || isSaving}
        icon={<Trash2 size={17} />}
        onToggle={() =>
          onChange({
            ...setting,
            allowMemberDeleteOwnChannel:
              !setting.allowMemberDeleteOwnChannel,
          })
        }
      />
    </div>
  );
}

function PermissionItem({
  checked,
  description,
  disabled,
  icon,
  onToggle,
  title,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  icon: ReactNode;
  onToggle: () => void;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between bg-white p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "bg-blue-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

import { SpaceSettingResponse } from "@/features/chat/types/chat.types";
import { normalizeSpaceSetting } from "@/features/chat/utils/space-setting-utils";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface PermissionsTabProps {
  isSaving: boolean;
  setting?: SpaceSettingResponse | null;
  onAllowMemberCreateChannelChange: (allowMemberCreateChannel: boolean) => void;
  onAllowMemberDeleteOwnChannelChange: (
    allowMemberDeleteOwnChannel: boolean,
  ) => void;
}

export function PermissionsTab({
  isSaving,
  setting,
  onAllowMemberCreateChannelChange,
  onAllowMemberDeleteOwnChannelChange,
}: PermissionsTabProps) {
  const intl = useAppIntl();
  const normalized = normalizeSpaceSetting(setting);
  const allowMemberCreateChannel = normalized.allowMemberCreateChannel;
  const allowMemberDeleteOwnChannel = normalized.allowMemberDeleteOwnChannel;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          {intl.formatMessage({ id: "chat.channelPermissions" })}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {intl.formatMessage({ id: "chat.memberChannelPermissionsHelp" })}
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-sm font-semibold text-slate-800">
            {intl.formatMessage({ id: "chat.allowMemberCreateChannel" })}
          </span>
          <input
            type="checkbox"
            checked={allowMemberCreateChannel}
            disabled={isSaving}
            onChange={(event) =>
              onAllowMemberCreateChannelChange(event.target.checked)
            }
            className="h-4 w-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-sm font-semibold text-slate-800">
            {intl.formatMessage({ id: "chat.allowMemberDeleteOwnChannel" })}
          </span>
          <input
            type="checkbox"
            checked={allowMemberDeleteOwnChannel}
            disabled={isSaving}
            onChange={(event) =>
              onAllowMemberDeleteOwnChannelChange(event.target.checked)
            }
            className="h-4 w-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
      </div>
    </div>
  );
}

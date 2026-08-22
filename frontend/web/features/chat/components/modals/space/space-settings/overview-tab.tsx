import { SpaceResponse } from "@/features/chat/types/chat.types";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface OverviewTabProps {
  detail: SpaceResponse;
  isOwner: boolean;
  isLoadingDetails: boolean;
  isSaving: boolean;
  originalName: string;
  spaceName: string;
  onSpaceNameChange: (name: string) => void;
  onSave: () => void;
}

export function OverviewTab({
  detail,
  isOwner,
  isLoadingDetails,
  isSaving,
  originalName,
  spaceName,
  onSpaceNameChange,
  onSave,
}: OverviewTabProps) {
  const intl = useAppIntl();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <OverviewStat
          label={intl.formatMessage({ id: "chat.members" })}
          value={isLoadingDetails ? "-" : (detail.memberCount ?? 0)}
        />
        <OverviewStat
          label={intl.formatMessage({ id: "chat.channels" })}
          value={isLoadingDetails ? "-" : (detail.channelCount ?? 0)}
        />
        <OverviewStat
          label={intl.formatMessage({ id: "chat.created" })}
          value={
            detail.createdAt
              ? new Date(detail.createdAt).toLocaleDateString(intl.locale)
              : "-"
          }
          compact
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {intl.formatMessage({ id: "chat.spaceName" })}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={spaceName}
            disabled={!isOwner || isSaving}
            onChange={(event) => onSpaceNameChange(event.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-500"
            maxLength={50}
          />
          {isOwner && (
            <button
              type="button"
              disabled={
                isSaving ||
                !spaceName.trim() ||
                spaceName.trim() === originalName
              }
              onClick={onSave}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving
                ? intl.formatMessage({ id: "app.saving" })
                : intl.formatMessage({ id: "app.save" })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p
        className={
          compact
            ? "mt-1 text-xs font-semibold text-slate-800"
            : "mt-1 text-xl font-bold text-slate-900"
        }
      >
        {value}
      </p>
    </div>
  );
}

import { LogOut, Trash2 } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface DangerZoneTabProps {
  isAdmin: boolean;
  isOwner?: boolean;
  isDeleting: boolean;
  isLastAdmin: boolean;
  isLeaving: boolean;
  isResolvingMembership?: boolean;
  onDelete: () => void;
  onLeave: () => void;
}

export function DangerZoneTab({
  isAdmin,
  isOwner = false,
  isDeleting,
  isLastAdmin,
  isLeaving,
  isResolvingMembership = false,
  onDelete,
  onLeave,
}: DangerZoneTabProps) {
  const intl = useAppIntl();

  if (isResolvingMembership) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
        <div className="mt-2 h-3 w-64 rounded bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-red-700">
              {intl.formatMessage({ id: "chat.leaveSpace" })}
            </p>
            <p className="mt-1 text-xs text-red-500">
              {intl.formatMessage({ id: "chat.leaveSpaceDescription" })}
            </p>
            {isOwner ? (
              <p className="mt-2 text-xs font-semibold text-red-700">
                {intl.formatMessage({
                  id: "chat.transferOwnershipBeforeLeaving",
                })}
              </p>
            ) : isLastAdmin ? (
              <p className="mt-2 text-xs font-semibold text-red-700">
                {intl.formatMessage({ id: "chat.lastAdminHelp" })}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={isLeaving || isLastAdmin || isOwner}
            onClick={onLeave}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <LogOut size={15} />
            {intl.formatMessage({ id: "chat.leave" })}
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="rounded-xl border border-red-200 bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-red-700">
                {intl.formatMessage({ id: "chat.deleteSpace" })}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {intl.formatMessage({ id: "chat.deleteSpaceDescription" })}
              </p>
            </div>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={15} />
              {intl.formatMessage({ id: "app.delete" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

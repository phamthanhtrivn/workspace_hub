import { RefreshCw, X } from "lucide-react";
import { SpaceInvitation } from "../../../types/chat.types";
import { SPACE_SETTINGS_LABELS } from "../../../types/space-settings.constants";

interface InvitationsTabProps {
  invitations: SpaceInvitation[];
  isLoading: boolean;
  isMutating: boolean;
  onCancel: (invitationId: string) => void;
  onResend: (invitationId: string) => void;
}

export function InvitationsTab({
  invitations,
  isLoading,
  isMutating,
  onCancel,
  onResend,
}: InvitationsTabProps) {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        {SPACE_SETTINGS_LABELS.loadingInvitations}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        {SPACE_SETTINGS_LABELS.noInvitations}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {invitation.invitedUserName ||
                invitation.invitee?.fullName ||
                invitation.invitedUserId}
            </p>
            <p className="text-xs text-slate-400">
              Invited {new Date(invitation.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Resend invitation"
              disabled={isMutating}
              onClick={() => onResend(invitation.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              title="Cancel invitation"
              disabled={isMutating}
              onClick={() => onCancel(invitation.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

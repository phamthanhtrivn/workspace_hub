import { SpaceInvitation } from "@/features/chat/types/chat.types";
import { SPACE_SETTINGS_LABELS } from "@/features/chat/types/space-settings/space-settings.constants";
import { RefreshCw, UserPlus, X } from "lucide-react";

interface InvitationsTabProps {
  invitations: SpaceInvitation[];
  isLoading: boolean;
  isMutating: boolean;
  onCancel: (invitationId: string) => void;
  onInvite: () => void;
  onResend: (invitationId: string) => void;
}

export function InvitationsTab({
  invitations,
  isLoading,
  isMutating,
  onCancel,
  onInvite,
  onResend,
}: InvitationsTabProps) {
  const header = (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-900">Invitations</h3>
        <p className="text-xs text-slate-400">
          Invite new members and manage pending invitations.
        </p>
      </div>
      <button
        type="button"
        onClick={onInvite}
        className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        <UserPlus size={14} />
        Invite members
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <>
        {header}
        <div className="py-8 text-center text-xs text-slate-400">
          {SPACE_SETTINGS_LABELS.loadingInvitations}
        </div>
      </>
    );
  }

  if (invitations.length === 0) {
    return (
      <>
        {header}
        <div className="py-8 text-center text-xs text-slate-400">
          {SPACE_SETTINGS_LABELS.noInvitations}
        </div>
      </>
    );
  }

  return (
    <div>
      {header}
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
    </div>
  );
}

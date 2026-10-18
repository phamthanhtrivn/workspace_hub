import { SpaceInvitation } from "@/features/chat/types/chat.types";
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
        <h3 className="text-sm font-semibold text-foreground">
          Invitations
        </h3>
        <p className="text-xs text-muted-foreground">
          Manage pending space invitations and invite new members.
        </p>
      </div>
      <button
        type="button"
        onClick={onInvite}
        className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-control bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary"
      >
        <UserPlus size={14} />
        Invite Members
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <>
        {header}
        <div className="py-8 text-center text-xs text-muted-foreground">
          Loading invitations...
        </div>
      </>
    );
  }

  if (invitations.length === 0) {
    return (
      <>
        {header}
        <div className="py-8 text-center text-xs text-muted-foreground">
          No pending invitations
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
            className="flex items-center justify-between rounded-panel border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {invitation.invitee?.fullName ||
                  invitation.invitee?.email ||
                  invitation.invitedUserId}
              </p>
              <p className="text-xs text-muted-foreground">
                {`Invited on ${new Date(invitation.createdAt).toLocaleDateString("en-US")}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Resend Invitation"
                disabled={isMutating}
                onClick={() => onResend(invitation.id)}
                className="p-2 rounded-control text-muted-foreground hover:text-info-content hover:bg-info-soft disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={16} />
              </button>
              <button
                type="button"
                title="Cancel Invitation"
                disabled={isMutating}
                onClick={() => onCancel(invitation.id)}
                className="p-2 rounded-control text-muted-foreground hover:text-destructive-content hover:bg-destructive-soft disabled:opacity-50 cursor-pointer"
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


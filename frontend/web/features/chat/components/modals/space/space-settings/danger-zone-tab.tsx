import { LogOut, Trash2 } from "lucide-react";

interface DangerZoneTabProps {
  isAdmin: boolean;
  isOwner?: boolean;
  canDelete?: boolean;
  hideLeave?: boolean;
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
  canDelete = isOwner,
  hideLeave = false,
  isDeleting,
  isLastAdmin,
  isLeaving,
  isResolvingMembership = false,
  onDelete,
  onLeave,
}: DangerZoneTabProps) {
  if (isResolvingMembership) {
    return (
      <div className="rounded-panel border border-border bg-background p-4">
        <div className="h-4 w-28 rounded bg-accent animate-pulse" />
        <div className="mt-2 h-3 w-64 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!hideLeave && (
        <div className="rounded-panel border border-border bg-destructive-soft/60 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-destructive">
                Leave Space
              </p>
              <p className="mt-1 text-xs text-destructive">
                You will lose access to all channels and messages in this space.
              </p>
              {isOwner ? (
                <p className="mt-2 text-xs font-semibold text-destructive">
                  You must transfer ownership to another member before leaving this space.
                </p>
              ) : isLastAdmin ? (
                <p className="mt-2 text-xs font-semibold text-destructive">
                  You are the last admin in this space. Promote another member to admin before leaving.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={isLeaving || isLastAdmin || isOwner}
              onClick={onLeave}
              className="inline-flex items-center gap-2 rounded-control bg-card px-3 py-2 text-sm font-semibold text-destructive border border-border hover:bg-destructive-soft disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <LogOut size={15} />
              Leave
            </button>
          </div>
        </div>
      )}

      {canDelete && (
        <div className="rounded-panel border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-destructive">
                Delete Space
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Permanently delete this space and all its channels, messages, and files. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-control bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


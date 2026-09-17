"use client";

import { Clock3, RotateCw, Trash2, User } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import type { ProjectInvitationWithUser } from "@/features/project/api/invitation.api";
import {
  useCancelProjectInvitation,
  useResendProjectInvitation,
} from "@/features/project/hooks/use-invitations";
import { useProjectConfirmDialog } from "@/features/project/hooks/use-project-confirm-dialog";
import { ProjectConfirmDialog } from "../ui/project-confirm-dialog";

import { Button } from "@/components/ui/button";

export default function PendingInvitationsList({
  projectId,
  invitations,
}: {
  projectId: string;
  invitations: ProjectInvitationWithUser[];
}) {
  const cancelMutation = useCancelProjectInvitation(projectId);
  const resendMutation = useResendProjectInvitation(projectId);
  const { dialogProps, confirm } = useProjectConfirmDialog();

  if (invitations.length === 0) return null;

  const handleCancel = (invitation: ProjectInvitationWithUser) => {
    const name =
      invitation.invitedUser.fullName ||
      invitation.invitedUser.email ||
      "this user";

    confirm({
      title: `Revoke Invitation for ${name}`,
      description: "Are you sure you want to revoke this pending invitation? They will no longer be able to join the project using this invite.",
      confirmLabel: "Revoke Invitation",
      cancelLabel: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await cancelMutation.mutateAsync(invitation.id);
          toast.success("Invitation revoked");
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to revoke invitation",
          );
        }
      },
    });
  };

  const handleResend = async (invitation: ProjectInvitationWithUser) => {
    try {
      await resendMutation.mutateAsync(invitation.id);
      toast.success("Invitation resent");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to resend invitation",
      );
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center gap-2 px-2">
        <Clock3 className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          Pending Invitations ({invitations.length})
        </p>
      </div>
      <div className="space-y-1.5">
        {invitations.map((invitation) => {
          const user = invitation.invitedUser;
          const displayName = user.fullName || "User";
          const isCancelling =
            cancelMutation.isPending &&
            cancelMutation.variables === invitation.id;
          const isResending =
            resendMutation.isPending &&
            resendMutation.variables === invitation.id;

          const expiryText = invitation.expiresAt
            ? new Date(invitation.expiresAt).toLocaleDateString()
            : "Unlimited";

          return (
            <div
              key={invitation.id}
              className="group flex items-center gap-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2.5"
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt=""
                  width={36}
                  height={36}
                  unoptimized
                  className="h-9 w-9 rounded-full object-cover grayscale-[20%]"
                />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-400 shadow-xs">
                  <User className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-700">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {user.email || "Awaiting response"} • Expires: {expiryText}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleResend(invitation)}
                  disabled={isCancelling || resendMutation.isPending}
                  className="h-8 w-8 cursor-pointer rounded-lg text-slate-400 transition hover:bg-white hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Resend invitation for ${displayName}`}
                  title="Resend invitation"
                >
                  <RotateCw
                    className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCancel(invitation)}
                  disabled={isResending || cancelMutation.isPending}
                  className="h-8 w-8 cursor-pointer rounded-lg text-slate-400 transition hover:bg-white hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Revoke invitation for ${displayName}`}
                  title="Revoke invitation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ProjectConfirmDialog {...dialogProps} />
    </div>
  );
}

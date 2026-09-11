"use client";

import { Clock3, RotateCw, Trash2, User } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import type { ProjectInvitationWithUser } from "@/features/project/api/invitation.api";
import {
  useCancelProjectInvitation,
  useResendProjectInvitation,
} from "@/features/project/hooks/use-invitations";
import { confirmProjectAction } from "@/features/project/project-alert";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export default function PendingInvitationsList({
  projectId,
  invitations,
}: {
  projectId: string;
  invitations: ProjectInvitationWithUser[];
}) {
  const intl = useAppIntl();
  const cancelMutation = useCancelProjectInvitation(projectId);
  const resendMutation = useResendProjectInvitation(projectId);

  if (invitations.length === 0) return null;

  const handleCancel = async (invitation: ProjectInvitationWithUser) => {
    const name =
      invitation.invitedUser.fullName ||
      invitation.invitedUser.email ||
      intl.formatMessage({ id: "app.thisUser" });
    const confirmed = await confirmProjectAction({
      title: intl.formatMessage(
        { id: "project.invitation.revokeConfirmTitle" },
        { name },
      ),
      text: intl.formatMessage({ id: "project.invitation.revokeConfirmText" }),
      confirmText: intl.formatMessage({ id: "project.invitation.revoke" }),
      cancelText: intl.formatMessage({ id: "app.cancel" }),
      icon: "warning",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await cancelMutation.mutateAsync(invitation.id);
      toast.success(intl.formatMessage({ id: "project.invitation.revoked" }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : intl.formatMessage({ id: "project.invitation.revokeFailed" }),
      );
    }
  };

  const handleResend = async (invitation: ProjectInvitationWithUser) => {
    try {
      await resendMutation.mutateAsync(invitation.id);
      toast.success(intl.formatMessage({ id: "project.invitation.resent" }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : intl.formatMessage({ id: "project.invitation.resendFailed" }),
      );
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center gap-2 px-2">
        <Clock3 className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          {intl.formatMessage(
            { id: "project.invitation.pendingTitle" },
            { count: invitations.length },
          )}
        </p>
      </div>
      <div className="space-y-1.5">
        {invitations.map((invitation) => {
          const user = invitation.invitedUser;
          const displayName =
            user.fullName || intl.formatMessage({ id: "app.user" });
          const isCancelling =
            cancelMutation.isPending &&
            cancelMutation.variables === invitation.id;
          const isResending =
            resendMutation.isPending &&
            resendMutation.variables === invitation.id;

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
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
                  <User className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-700">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {intl.formatMessage(
                    { id: "project.invitation.expiry" },
                    {
                      email:
                        user.email ||
                        intl.formatMessage({ id: "project.invitation.awaitingResponse" }),
                      expiry: invitation.expiresAt
                        ? intl.formatDate(new Date(invitation.expiresAt), {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : intl.formatMessage({ id: "app.unlimited" }),
                    },
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleResend(invitation)}
                  disabled={isCancelling || resendMutation.isPending}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={intl.formatMessage(
                    { id: "project.invitation.resendFor" },
                    { name: displayName },
                  )}
                  title={intl.formatMessage({ id: "project.invitation.resend" })}
                >
                  <RotateCw
                    className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void handleCancel(invitation)}
                  disabled={isResending || cancelMutation.isPending}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={intl.formatMessage(
                    { id: "project.invitation.revokeFor" },
                    { name: displayName },
                  )}
                  title={intl.formatMessage({ id: "project.invitation.revoke" })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

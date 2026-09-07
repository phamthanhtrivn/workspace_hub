"use client";

import { Clock3, RotateCw, Trash2, User } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import type { ProjectInvitationWithUser } from "../api/invitation.api";
import {
  useCancelProjectInvitation,
  useResendProjectInvitation,
} from "../hooks/use-invitations";
import { confirmProjectAction } from "../project-alert";

function formatExpiry(value?: string): string {
  if (!value) return "Không giới hạn";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function PendingInvitationsList({
  projectId,
  invitations,
}: {
  projectId: string;
  invitations: ProjectInvitationWithUser[];
}) {
  const cancelMutation = useCancelProjectInvitation(projectId);
  const resendMutation = useResendProjectInvitation(projectId);

  if (invitations.length === 0) return null;

  const handleCancel = async (invitation: ProjectInvitationWithUser) => {
    const name = invitation.invitedUser.fullName || invitation.invitedUser.email || "người này";
    const confirmed = await confirmProjectAction({
      title: `Thu hồi lời mời của ${name}?`,
      text: "Người này sẽ không thể chấp nhận lời mời hiện tại nữa.",
      confirmText: "Thu hồi",
      icon: "warning",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await cancelMutation.mutateAsync(invitation.id);
      toast.success("Đã thu hồi lời mời");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thu hồi lời mời");
    }
  };

  const handleResend = async (invitation: ProjectInvitationWithUser) => {
    try {
      await resendMutation.mutateAsync(invitation.id);
      toast.success("Đã gửi lại lời mời");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi lại lời mời");
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center gap-2 px-2">
        <Clock3 className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          Lời mời đang chờ ({invitations.length})
        </p>
      </div>
      <div className="space-y-1.5">
        {invitations.map((invitation) => {
          const user = invitation.invitedUser;
          const displayName = user.fullName || "Người dùng";
          const isCancelling = cancelMutation.isPending && cancelMutation.variables === invitation.id;
          const isResending = resendMutation.isPending && resendMutation.variables === invitation.id;

          return (
            <div key={invitation.id} className="group flex items-center gap-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2.5">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover grayscale-[20%]" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-400 shadow-sm"><User className="h-4 w-4" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-700">{displayName}</p>
                <p className="truncate text-[11px] text-slate-400">
                  {user.email || "Đang chờ phản hồi"} · hết hạn {formatExpiry(invitation.expiresAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => void handleResend(invitation)} disabled={isCancelling || resendMutation.isPending} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Gửi lại lời mời cho ${displayName}`} title="Gửi lại">
                  <RotateCw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
                </button>
                <button type="button" onClick={() => void handleCancel(invitation)} disabled={isResending || cancelMutation.isPending} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Thu hồi lời mời của ${displayName}`} title="Thu hồi">
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

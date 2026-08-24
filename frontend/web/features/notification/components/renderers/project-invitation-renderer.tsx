"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  FolderKanban,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/date";
import { useAppDispatch } from "@/store/store";
import { setProjectInvitationStatus } from "@/store/notification/notification.slice";
import { useRespondProjectInvitation } from "@/features/project/hooks/use-invitations";
import type {
  Notification,
  ProjectInvitationMetadata,
  ProjectInvitationNotificationStatus,
} from "../../types/notification.types";

const statusLabels: Record<ProjectInvitationNotificationStatus, string> = {
  PENDING: "Đang chờ phản hồi",
  ACCEPTED: "Đã chấp nhận",
  DECLINED: "Đã từ chối",
  CANCELLED: "Đã thu hồi",
  EXPIRED: "Đã hết hạn",
};

const statusClasses: Record<ProjectInvitationNotificationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DECLINED: "bg-slate-100 text-slate-600 ring-slate-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
  EXPIRED: "bg-rose-50 text-rose-700 ring-rose-200",
};

function getMetadata(notification: Notification): ProjectInvitationMetadata {
  return notification.metadata as unknown as ProjectInvitationMetadata;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string")
      return response.data.message;
  }
  return error instanceof Error ? error.message : "Không thể xử lý lời mời";
}

export function ProjectInvitationListItemRenderer({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const metadata = getMetadata(notification);
  const status = metadata.status || "PENDING";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-slate-100 p-3 text-left transition last:border-0 hover:bg-blue-50/50 ${
        notification.isRead ? "bg-white" : "bg-blue-50/60"
      }`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
        <FolderKanban className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-black text-slate-900">
            Lời mời tham gia dự án
          </span>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">
            {formatTimeAgo(new Date(notification.createdAt))}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-600">
          {metadata.projectName || notification.content}
        </span>
        <span
          className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${statusClasses[status]}`}
        >
          {statusLabels[status]}
        </span>
      </span>
      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      )}
    </button>
  );
}

export function ProjectInvitationModalRenderer({
  notification,
  onClose,
  onMarkAsRead,
}: {
  notification: Notification;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}) {
  const metadata = getMetadata(notification);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const respondMutation = useRespondProjectInvitation();
  const [status, setStatus] = useState<ProjectInvitationNotificationStatus>(
    metadata.status || "PENDING",
  );
  const [action, setAction] = useState<"accept" | "decline" | null>(null);

  const respond = async (nextAction: "accept" | "decline") => {
    if (!metadata.invitationId) {
      toast.error("Thông tin lời mời không hợp lệ");
      return;
    }
    setAction(nextAction);
    try {
      const invitation = await respondMutation.mutateAsync({
        invitationId: metadata.invitationId,
        action: nextAction,
      });
      const nextStatus = invitation.status;
      setStatus(nextStatus);
      dispatch(
        setProjectInvitationStatus({
          notificationId: notification.id,
          status: nextStatus,
        }),
      );
      onMarkAsRead(notification.id);
      toast.success(
        nextAction === "accept" ? "Đã tham gia dự án" : "Đã từ chối lời mời",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setAction(null);
    }
  };

  const isPending = status === "PENDING";

  return (
    <div className="p-5">
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 text-center ring-1 ring-blue-100">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
          <FolderKanban className="h-7 w-7" />
        </span>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
          Lời mời tham gia dự án
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-950">
          {metadata.projectName}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Bạn được mời tham gia dự án này với vai trò thành viên.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Clock3 className="h-4 w-4" />
          {metadata.expiresAt
            ? `Hết hạn ${new Date(metadata.expiresAt).toLocaleDateString("vi-VN")}`
            : "Không có thời hạn"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusClasses[status]}`}
        >
          {statusLabels[status]}
        </span>
      </div>

      {isPending ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void respond("decline")}
            disabled={action !== null}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
          >
            {action === "decline" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Từ chối
          </button>
          <button
            type="button"
            onClick={() => void respond("accept")}
            disabled={action !== null}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
          >
            {action === "accept" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Chấp nhận
          </button>
        </div>
      ) : status === "ACCEPTED" ? (
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push(`/projects/${metadata.projectId}`);
          }}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          Mở dự án
        </button>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full rounded-xl py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
      >
        Đóng
      </button>
    </div>
  );
}

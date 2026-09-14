"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  Clock3,
  FolderKanban,
  Loader2,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/date";
import { useAppDispatch } from "@/store/store";
import { setProjectInvitationStatus } from "@/store/notification/notification.slice";
import { useRespondProjectInvitation } from "@/features/project/hooks/use-invitations";
import { useProjectInviterIdentity } from "../../hooks/use-project-inviter-identity";
import { getNotificationApiErrorMessage } from "../../utils/notification-display.utils";
import {
  formatProjectInvitationExpiryDate,
  getProjectColor,
  getProjectInvitationMetadata,
  getProjectInviterInitials,
} from "../../utils/project-invitation.utils";
import { NotificationCategoryIcon } from "../notification-category-icon";
import type {
  Notification,
  ProjectInvitationNotificationStatus,
} from "../../types/notification.types";

const statusClasses: Record<ProjectInvitationNotificationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DECLINED: "bg-slate-100 text-slate-600 ring-slate-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
  EXPIRED: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function ProjectInvitationListItemRenderer({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const metadata = getProjectInvitationMetadata(notification);
  const status = metadata.status || "PENDING";
  const projectName = metadata.projectName || "Untitled project";
  const inviter = useProjectInviterIdentity(notification, "A project member");
  const inviterName = inviter.name;
  const projectColor = getProjectColor(metadata.projectColor);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full cursor-pointer items-start gap-3 border-b border-slate-100 p-3 text-left transition last:border-0 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
        notification.isRead ? "bg-white" : "bg-blue-50/60"
      }`}
    >
      <NotificationCategoryIcon notification={notification} />

      <span className="min-w-0 flex-1">
        <span className="mb-1 flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">
            Project invite
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {formatTimeAgo(new Date(notification.createdAt))}
          </span>
        </span>

        <span className="flex items-center gap-1.5 truncate text-sm font-black text-slate-900">
          {metadata.projectIcon?.trim() ? (
            <span
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-xs"
              style={{ color: projectColor }}
            >
              {metadata.projectIcon.trim()}
            </span>
          ) : null}
          <span className="truncate">{projectName}</span>
        </span>

        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
          {`Invited by ${inviterName}`}
        </span>

        <span
          className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${statusClasses[status]}`}
        >
          {status === "PENDING"
            ? "Awaiting response"
            : status === "ACCEPTED"
              ? "Accepted"
              : status === "DECLINED"
                ? "Declined"
                : status === "CANCELLED"
                  ? "Revoked"
                  : "Expired"}
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
  const metadata = getProjectInvitationMetadata(notification);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const respondMutation = useRespondProjectInvitation();
  const [status, setStatus] = useState<ProjectInvitationNotificationStatus>(
    metadata.status || "PENDING",
  );
  const [action, setAction] = useState<"accept" | "decline" | null>(null);
  const projectName = metadata.projectName || "Untitled project";
  const inviter = useProjectInviterIdentity(notification, "A project member");
  const inviterName = inviter.name;
  const projectColor = getProjectColor(metadata.projectColor);

  const respond = async (nextAction: "accept" | "decline") => {
    if (!metadata.invitationId) {
      toast.error("Invitation information is invalid");
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
        nextAction === "accept"
          ? "You joined the project"
          : "Invitation declined",
      );
    } catch (error) {
      toast.error(
        getNotificationApiErrorMessage(
          error,
          "Could not respond. The invitation may have expired or already been handled.",
        ),
      );
    } finally {
      setAction(null);
    }
  };

  const isPending = status === "PENDING";

  return (
    <div className="p-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-start gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl font-black ring-1 ring-inset ring-current/10"
            style={{ backgroundColor: `${projectColor}14`, color: projectColor }}
            aria-label={projectName}
          >
            {metadata.projectIcon?.trim() || (
              <FolderKanban className="h-7 w-7" />
            )}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">
              Project invitation
            </p>
            <h3 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
              {projectName}
            </h3>
            <p className="mt-1.5 text-sm leading-5 text-slate-600">
              You were invited to join this project as a member.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-3">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-xs font-black text-slate-600 ring-1 ring-slate-200">
            {inviter.avatar ? (
              <Image
                src={inviter.avatar}
                alt={inviterName}
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : getProjectInviterInitials(inviterName) ? (
              getProjectInviterInitials(inviterName)
            ) : (
              <UserRound className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Invited by
            </p>
            <p className="truncate text-sm font-bold text-slate-800">
              {inviterName}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Clock3 className="h-4 w-4" />
          {metadata.expiresAt
            ? `Expires: ${formatProjectInvitationExpiryDate(metadata.expiresAt)}`
            : "No expiration date"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusClasses[status]}`}
        >
          {status === "PENDING"
            ? "Awaiting response"
            : status === "ACCEPTED"
              ? "Accepted"
              : status === "DECLINED"
                ? "Declined"
                : status === "CANCELLED"
                  ? "Revoked"
                  : "Expired"}
        </span>
      </div>

      {isPending ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void respond("decline")}
            disabled={action !== null}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action === "decline" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Decline
          </button>
          <button
            type="button"
            onClick={() => void respond("accept")}
            disabled={action !== null}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action === "accept" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Join
          </button>
        </div>
      ) : status === "ACCEPTED" ? (
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push(`/projects/${metadata.projectId}`);
          }}
          className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-px"
        >
          <CheckCircle2 className="h-4 w-4" />
          Open project
        </button>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full cursor-pointer rounded-xl py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 active:translate-y-px"
      >
        Close
      </button>
    </div>
  );
}

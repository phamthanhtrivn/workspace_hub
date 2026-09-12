"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
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
import { getUserProfiles } from "@/features/project/api/project.api";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import type {
  Notification,
  ProjectInvitationMetadata,
  ProjectInvitationNotificationStatus,
} from "../../types/notification.types";

const statusMessageIds: Record<ProjectInvitationNotificationStatus, string> = {
  PENDING: "notification.projectInvitation.status.pending",
  ACCEPTED: "notification.projectInvitation.status.accepted",
  DECLINED: "notification.projectInvitation.status.declined",
  CANCELLED: "notification.projectInvitation.status.cancelled",
  EXPIRED: "notification.projectInvitation.status.expired",
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string")
      return response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
}

function getProjectColor(value?: string | null): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : "#0052CC";
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function useInviterIdentity(notification: Notification, fallbackName: string) {
  const senderId = notification.senderId;
  const profileQuery = useQuery({
    queryKey: ["users", "profile", senderId],
    queryFn: async () => {
      const profiles = await getUserProfiles(senderId ? [senderId] : []);
      return senderId ? profiles.get(senderId) : undefined;
    },
    enabled: Boolean(senderId && !notification.senderName),
    staleTime: 5 * 60 * 1_000,
  });

  return {
    name: notification.senderName || profileQuery.data?.fullName || fallbackName,
    avatar:
      notification.senderAvatar || profileQuery.data?.avatarUrl || undefined,
  };
}

export function ProjectInvitationListItemRenderer({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const intl = useAppIntl();
  const metadata = getMetadata(notification);
  const status = metadata.status || "PENDING";
  const projectName =
    metadata.projectName ||
    intl.formatMessage({ id: "notification.projectInvitation.fallbackProject" });
  const inviter = useInviterIdentity(
    notification,
    intl.formatMessage({ id: "notification.projectInvitation.fallbackInviter" }),
  );
  const inviterName = inviter.name;
  const projectColor = getProjectColor(metadata.projectColor);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-slate-100 p-3 text-left transition last:border-0 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
        notification.isRead ? "bg-white" : "bg-blue-50/60"
      }`}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-black ring-1 ring-inset ring-current/10"
        style={{ backgroundColor: `${projectColor}14`, color: projectColor }}
        aria-label={projectName}
      >
        {metadata.projectIcon?.trim() || <FolderKanban className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-black text-slate-900">
            {projectName}
          </span>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">
            {formatTimeAgo(new Date(notification.createdAt))}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
          {intl.formatMessage(
            { id: "notification.projectInvitation.invitedBy" },
            { name: inviterName },
          )}
        </span>
        <span
          className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${statusClasses[status]}`}
        >
          {intl.formatMessage({ id: statusMessageIds[status] })}
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
  const intl = useAppIntl();
  const metadata = getMetadata(notification);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const respondMutation = useRespondProjectInvitation();
  const [status, setStatus] = useState<ProjectInvitationNotificationStatus>(
    metadata.status || "PENDING",
  );
  const [action, setAction] = useState<"accept" | "decline" | null>(null);
  const projectName =
    metadata.projectName ||
    intl.formatMessage({ id: "notification.projectInvitation.fallbackProject" });
  const inviter = useInviterIdentity(
    notification,
    intl.formatMessage({ id: "notification.projectInvitation.fallbackInviter" }),
  );
  const inviterName = inviter.name;
  const projectColor = getProjectColor(metadata.projectColor);

  const respond = async (nextAction: "accept" | "decline") => {
    if (!metadata.invitationId) {
      toast.error(
        intl.formatMessage({ id: "notification.projectInvitation.invalid" }),
      );
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
        intl.formatMessage({
          id:
            nextAction === "accept"
              ? "project.invitation.accepted"
              : "project.invitation.declined",
        }),
      );
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          intl.formatMessage({ id: "project.invitation.respondFailed" }),
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
              {intl.formatMessage({ id: "notification.projectInvitation.title" })}
            </p>
            <h3 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
              {projectName}
            </h3>
            <p className="mt-1.5 text-sm leading-5 text-slate-600">
              {intl.formatMessage({ id: "notification.projectInvitation.memberRole" })}
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
            ) : getInitials(inviterName) ? (
              getInitials(inviterName)
            ) : (
              <UserRound className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {intl.formatMessage({ id: "notification.projectInvitation.inviterLabel" })}
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
            ? intl.formatMessage(
                { id: "project.invitation.expiresAt" },
                {
                  date: intl.formatDate(new Date(metadata.expiresAt), {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }),
                },
              )
            : intl.formatMessage({
                id: "notification.projectInvitation.noExpiry",
              })}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusClasses[status]}`}
        >
          {intl.formatMessage({ id: statusMessageIds[status] })}
        </span>
      </div>

      {isPending ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void respond("decline")}
            disabled={action !== null}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 active:translate-y-px disabled:opacity-60"
          >
            {action === "decline" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {intl.formatMessage({ id: "project.invitation.decline" })}
          </button>
          <button
            type="button"
            onClick={() => void respond("accept")}
            disabled={action !== null}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:translate-y-px disabled:opacity-60"
          >
            {action === "accept" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {intl.formatMessage({ id: "project.invitation.accept" })}
          </button>
        </div>
      ) : status === "ACCEPTED" ? (
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push(`/projects/${metadata.projectId}`);
          }}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-px"
        >
          <CheckCircle2 className="h-4 w-4" />
          {intl.formatMessage({ id: "notification.projectInvitation.openProject" })}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full rounded-xl py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 active:translate-y-px"
      >
        {intl.formatMessage({ id: "notification.projectInvitation.close" })}
      </button>
    </div>
  );
}

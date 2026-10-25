"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  Clock3,
  FolderKanban,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
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
import { NotificationListRow } from "../notification-list-row";
import type {
  Notification,
  ProjectInvitationNotificationStatus,
} from "../../types/notification.types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";


const statusClasses: Record<ProjectInvitationNotificationStatus, string> = {
  PENDING: "bg-warning-soft text-warning-content ring-warning-outline",
  ACCEPTED: "bg-success-soft text-success-content ring-success-outline",
  DECLINED: "bg-muted text-muted-foreground ring-ring",
  CANCELLED: "bg-muted text-muted-foreground ring-ring",
  EXPIRED: "bg-destructive-soft text-destructive-content ring-destructive-outline",
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
    <NotificationListRow notification={notification} onClick={onClick}
      badge={<span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-info-content">Project invite</span>}
      title={<span className="flex min-w-0 items-start gap-1.5">{metadata.projectIcon?.trim() && <span className="inline-flex size-4 shrink-0 items-center justify-center text-xs" style={{ color: projectColor }}>{metadata.projectIcon.trim()}</span>}<span className="min-w-0">{projectName}</span></span>}
      description={"Invited by " + inviterName}
    >
      <span className={"mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 " + statusClasses[status]}>
        {status === "PENDING" ? "Awaiting response" : status === "ACCEPTED" ? "Accepted" : status === "DECLINED" ? "Declined" : status === "CANCELLED" ? "Revoked" : "Expired"}
      </span>
    </NotificationListRow>
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
      <div className="rounded-panel border border-border bg-background p-4">
        <div className="flex items-start gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-panel text-2xl font-semibold ring-1 ring-inset ring-current/10"
            style={{ backgroundColor: `${projectColor}14`, color: "var(--foreground)" }}
            aria-label={projectName}
          >
            {metadata.projectIcon?.trim() || (
              <FolderKanban className="h-7 w-7" />
            )}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-info-content">
              Project invitation
            </p>
            <h3 className="mt-1 truncate text-section-title font-semibold tracking-tight text-foreground">
              {projectName}
            </h3>
            <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
              You were invited to join this project as a member.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-panel bg-card text-xs font-semibold text-muted-foreground ring-1 ring-ring">
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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Invited by
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {inviterName}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-panel border border-border bg-background px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          {metadata.expiresAt
            ? `Expires: ${formatProjectInvitationExpiryDate(metadata.expiresAt)}`
            : "No expiration date"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClasses[status]}`}
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
          <Button aria-busy={action === "decline" || undefined} variant="unstyled"
            type="button"
            onClick={() => void respond("decline")}
            disabled={action !== null}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-border bg-card text-sm font-semibold text-muted-foreground transition hover:border-border hover:bg-destructive-soft hover:text-destructive-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action === "decline" ? (
              <Spinner />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Decline
          </Button>
          <Button aria-busy={action === "accept" || undefined} variant="default"
            type="button"
            onClick={() => void respond("accept")}
            disabled={action !== null}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-control text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action === "accept" ? (
              <Spinner tone="inherit" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Join
          </Button>
        </div>
      ) : status === "ACCEPTED" ? (
        <Button variant="success"
          type="button"
          onClick={() => {
            onClose();
            router.push(`/projects/${metadata.projectId}`);
          }}
          className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-control text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Open project
        </Button>
      ) : null}

      <Button variant="ghost"
        type="button"
        onClick={onClose}
        className="mt-3 w-full cursor-pointer rounded-control py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Close
      </Button>
    </div>
  );
}

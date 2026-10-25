"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Notification,
  InvitationMetadata,
} from "../../types/notification.types";
import {
  ArrowRight,
  CheckCircle2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import {
  acceptInvitation,
  declineInvitation,
  getPendingInvitations,
} from "@/features/chat/api/chat.api";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/store/store";
import { setActiveSpaceId } from "@/store/chat/chat-slice";
import {
  getNotificationApiErrorMessage,
  getSpaceInvitationInitials,
} from "../../utils/notification-display.utils";
import { NotificationListRow } from "../notification-list-row";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";


function SenderAvatar({
  notification,
  size = "md",
}: {
  notification: Notification;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-16 w-16 text-base" : "h-11 w-11 text-sm";

  return (
    <div
      className={`${sizeClass} relative flex shrink-0 items-center justify-center overflow-hidden rounded-panel border border-border bg-info-soft font-semibold text-muted-foreground ring-1 ring-ring`}
    >
      {notification.senderAvatar ? (
        <Image
          src={notification.senderAvatar}
          alt={notification.senderName || "Sender avatar"}
          fill
          sizes={size === "lg" ? "64px" : "44px"}
          className="object-cover"
        />
      ) : (
        <span>{getSpaceInvitationInitials(notification.senderName)}</span>
      )}
    </div>
  );
}

export const InvitationListItemRenderer: React.FC<{
  notification: Notification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  const metadata = notification.metadata as unknown as InvitationMetadata;
  const spaceName = metadata?.spaceName || metadata?.conversationName || "space";

  return (
    <NotificationListRow notification={notification} onClick={onClick}
      badge={<span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-info-content">Space invite</span>}
      title={<>{notification.senderName || "Someone"} invited you to <span className="text-info-content">{spaceName}</span></>}
      description={notification.content}
    />
  );
};

export const InvitationModalRenderer: React.FC<{
  notification: Notification;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}> = ({ notification, onClose, onMarkAsRead }) => {
  const metadata = notification.metadata as unknown as InvitationMetadata;
  const router = useRouter();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<"accept" | "decline" | null>(null);
  const responseInFlight = useRef(false);
  const [isResponded, setIsResponded] = useState(false);
  const spaceName = metadata?.spaceName || metadata?.conversationName || "this space";

  useEffect(() => {
    if (metadata?.invitationId) {
      getPendingInvitations()
        .then((res) => {
          if (res && res.data) {
            const isPending = res.data.some(
              (inv: { id: string }) => inv.id === metadata.invitationId,
            );
            setIsResponded(!isPending);
          }
        })
        .catch(console.error);
    }
  }, [metadata?.invitationId]);

  const handleResponse = async (action: "accept" | "decline") => {
    if (!metadata?.invitationId) {
      toast.error("Invitation information is missing");
      return;
    }

    const successText =
      action === "accept" ? "Invitation accepted successfully" : "Invitation declined";
    if (responseInFlight.current) return;
    responseInFlight.current = true;

    try {
      setIsProcessing(true);

      if (action === "accept") {
        await acceptInvitation(metadata.invitationId);
        if (metadata?.spaceId) {
          dispatch(setActiveSpaceId(metadata.spaceId));
        }
      } else {
        await declineInvitation(metadata.invitationId);
      }

      toast.success(successText);
      setIsResponded(true);
      setPendingAction(null);
      onMarkAsRead(notification.id);

      if (action === "accept") {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["spaces"] });
        queryClient.invalidateQueries({ queryKey: ["channels", metadata.spaceId] });
        router.push("/chat");
      }
    } catch (error) {
      toast.error(getNotificationApiErrorMessage(error, "Action failed"));
    } finally {
      responseInFlight.current = false;
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-card">
      <div className="relative overflow-hidden bg-info-soft px-6 pb-6 pt-7 text-center">
        <div className="mx-auto mb-4 flex w-fit items-center gap-3 rounded-panel border border-border bg-card p-2 ring-1 ring-ring/70">
          <SenderAvatar notification={notification} size="lg" />
          <div className="flex h-12 w-12 items-center justify-center rounded-panel bg-primary text-primary-foreground">
            <UserPlus size={22} />
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-info-content">
          Space invitation
        </p>
        <h3 className="text-section-title font-semibold tracking-tight text-foreground">
          {spaceName}
        </h3>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          <span className="font-semibold text-foreground">
            {notification.senderName || "Someone"}
          </span>{" "}
          invited you to collaborate in this space.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-panel border border-border bg-background p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-panel bg-card text-info-content ring-1 ring-ring">
              <Users size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {spaceName}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {notification.content}
              </p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-muted-foreground" />
          </div>
        </div>

        {isResponded ? (
          <div className="flex items-center justify-center gap-2 rounded-panel border border-border bg-success-soft p-3 text-sm font-semibold text-success-content">
            <CheckCircle2 size={17} />
            This invitation has already been handled
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline"
              onClick={() => setPendingAction("decline")}
              disabled={isProcessing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition hover:border-border hover:bg-destructive-soft hover:text-destructive-content disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <XCircle size={16} />
              Decline
            </Button>
            <Button aria-busy={isProcessing || undefined}
              onClick={() => setPendingAction("accept")}
              disabled={isProcessing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isProcessing ? (
                <Spinner tone="inherit" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Join
            </Button>
          </div>
        )}

        <Button variant="ghost"
          onClick={onClose}
          className="w-full rounded-control py-2 text-xs font-semibold transition cursor-pointer"
        >
          Close
        </Button>
      </div>
      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !isProcessing) setPendingAction(null); }} closeOnEscape={!isProcessing} closeOnOutsideClick={!isProcessing}>
        <AlertDialogContent showCloseButton={!isProcessing}>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction === "accept" ? "Join this space?" : "Decline invitation?"}</AlertDialogTitle>
            <AlertDialogDescription>{pendingAction === "accept" ? `You will join ${spaceName} and see its chat channels.` : `This invitation to ${spaceName} will be dismissed.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={isProcessing} onClick={() => setPendingAction(null)}>Cancel</Button>
            <Button loading={isProcessing} type="button" variant={pendingAction === "decline" ? "destructive" : "default"} disabled={isProcessing} onClick={() => { if (pendingAction) void handleResponse(pendingAction); }}>
              {isProcessing ? "Saving…" : pendingAction === "accept" ? "Join space" : "Decline"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

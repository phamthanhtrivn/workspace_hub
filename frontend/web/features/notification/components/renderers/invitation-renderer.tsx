"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Notification,
  InvitationMetadata,
} from "../../types/notification.types";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/date";
import {
  acceptInvitation,
  declineInvitation,
  getPendingInvitations,
} from "@/features/chat/api/chat.api";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/store/store";
import { setActiveSpaceId, setActiveConversation } from "@/store/chat/chat-slice";

function getInitials(name?: string | null) {
  const source = name?.trim() || "Workspace";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

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
      className={`${sizeClass} relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white bg-gradient-to-br from-blue-100 via-slate-100 to-indigo-100 font-black text-slate-600 shadow-sm ring-1 ring-slate-200`}
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
        <span>{getInitials(notification.senderName)}</span>
      )}
    </div>
  );
}

export const InvitationListItemRenderer: React.FC<{
  notification: Notification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  const metadata = notification.metadata as InvitationMetadata;
  const spaceName = metadata?.spaceName || metadata?.conversationName || "space";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full gap-3 border-b border-slate-100 p-3 text-left transition last:border-0 hover:bg-blue-50/45 ${
        !notification.isRead ? "bg-blue-50/60" : "bg-white"
      }`}
    >
      <div className="relative">
        <SenderAvatar notification={notification} />
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-sm">
          <UserPlus size={11} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">
            Space invite
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {formatTimeAgo(new Date(notification.createdAt))}
          </span>
        </div>

        <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-800">
          <span className="text-slate-950">
            {notification.senderName || "Someone"}
          </span>{" "}
          invited you to{" "}
          <span className="text-blue-700">{spaceName}</span>
        </p>

        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
          {notification.content}
        </p>
      </div>

      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500 shadow-sm shadow-blue-500/40" />
      )}
    </button>
  );
};

export const InvitationModalRenderer: React.FC<{
  notification: Notification;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}> = ({ notification, onClose, onMarkAsRead }) => {
  const metadata = notification.metadata as InvitationMetadata;
  const router = useRouter();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResponded, setIsResponded] = useState(false);
  const spaceName = metadata?.spaceName || metadata?.conversationName || "this space";

  useEffect(() => {
    if (metadata?.invitationId) {
      getPendingInvitations()
        .then((res) => {
          if (res && res.data) {
            const isPending = res.data.some(
              (inv: any) => inv.id === metadata.invitationId,
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
    const result = await Swal.fire({
      title: action === "accept" ? "Join this space?" : "Decline invitation?",
      text:
        action === "accept"
          ? `You will join ${spaceName} and see its chat channels.`
          : `This invitation to ${spaceName} will be dismissed.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: action === "accept" ? "#2563eb" : "#dc2626",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: action === "accept" ? "Join space" : "Decline",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

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
      onMarkAsRead(notification.id);

      if (action === "accept") {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["spaces"] });
        queryClient.invalidateQueries({ queryKey: ["channels", metadata.spaceId] });
        router.push("/chat");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50 px-6 pb-6 pt-7 text-center">
        <div className="mx-auto mb-4 flex w-fit items-center gap-3 rounded-2xl border border-white bg-white/80 p-2 shadow-sm ring-1 ring-slate-200/70">
          <SenderAvatar notification={notification} size="lg" />
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <UserPlus size={22} />
          </div>
        </div>

        <p className="mb-2 text-xs font-black uppercase tracking-wide text-blue-700">
          Space invitation
        </p>
        <h3 className="text-2xl font-black tracking-tight text-slate-950">
          {spaceName}
        </h3>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">
          <span className="font-bold text-slate-900">
            {notification.senderName || "Someone"}
          </span>{" "}
          invited you to collaborate in this space.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
              <Users size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900">
                {spaceName}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {notification.content}
              </p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-slate-300" />
          </div>
        </div>

        {isResponded ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={17} />
            This invitation has already been handled
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleResponse("decline")}
              disabled={isProcessing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <XCircle size={16} />
              Decline
            </button>
            <button
              onClick={() => handleResponse("accept")}
              disabled={isProcessing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Join
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-xl py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};

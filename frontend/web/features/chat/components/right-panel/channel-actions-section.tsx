"use client";

import { LogOut, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { useAppDispatch } from "@/store/store";
import {
  setActiveConversation,
  setActiveSpaceId,
} from "@/store/chat/chat-slice";
import {
  disbandChannel,
  getSpaceDetails,
  leaveChannel,
} from "../../api/chat.api";
import { chatKeys } from "../../types/chat.constant";
import { ChannelResponse, ConversationRoles } from "../../types/chat.types";
import { getErrorMessage } from "../../types/space-settings.types";

interface ChannelActionsSectionProps {
  activeChannel: ChannelResponse;
  currentUserId: string | null;
  onClose: () => void;
}

const CHANNEL_ACTION_LABELS = {
  delete: "Delete channel",
  deleteDescription: "Permanently delete this channel and its messages.",
  deleteFailed: "Failed to delete channel",
  deleteSuccess: "Channel deleted",
  deleteTitle: "Delete channel?",
  deleteConfirm: "Delete",
  deleteText:
    "This channel and its messages will be permanently deleted.",
  leave: "Leave channel",
  leaveDefault: "Leave space",
  adminDescription: "Leave this channel or permanently delete it.",
  leaveDescription: "Leave this channel. You can rejoin later if it is public.",
  leaveDefaultDescription:
    "Leaving the default channel will remove you from this space.",
  leaveFailed: "Failed to leave channel",
  leaveSuccess: "Left channel",
  leaveDefaultSuccess: "Left space",
  leaveTitle: (label: string) => `${label}?`,
  cancel: "Cancel",
} as const;

export default function ChannelActionsSection({
  activeChannel,
  currentUserId,
  onClose,
}: ChannelActionsSectionProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const currentMember = activeChannel.members?.find(
    (member) => member.userId === currentUserId,
  );
  const isAdmin = currentMember?.role === ConversationRoles.ADMIN;
  const isCreator = activeChannel.createdBy === currentUserId;
  const shouldLoadSpaceSetting =
    Boolean(activeChannel.spaceId) &&
    !activeChannel.isDefault &&
    !isAdmin &&
    isCreator;

  const spaceDetailsQuery = useQuery({
    queryKey: chatKeys.spaceDetails(activeChannel.spaceId),
    queryFn: async () => (await getSpaceDetails(activeChannel.spaceId)).data,
    enabled: shouldLoadSpaceSetting,
  });

  const canDeleteChannel =
    !activeChannel.isDefault &&
    (isAdmin ||
      (isCreator &&
        Boolean(
          spaceDetailsQuery.data?.setting?.allowMemberDeleteOwnChannel,
        )));
  const isResolvingAction = shouldLoadSpaceSetting && spaceDetailsQuery.isLoading;
  const canLeaveChannel = !activeChannel.isDefault || !isAdmin;
  const actionLabel = activeChannel.isDefault
    ? CHANNEL_ACTION_LABELS.leaveDefault
    : CHANNEL_ACTION_LABELS.leave;
  const actionDescription =
    isAdmin && !activeChannel.isDefault
      ? CHANNEL_ACTION_LABELS.adminDescription
      : canDeleteChannel
        ? CHANNEL_ACTION_LABELS.deleteDescription
        : activeChannel.isDefault
          ? CHANNEL_ACTION_LABELS.leaveDefaultDescription
          : CHANNEL_ACTION_LABELS.leaveDescription;

  const invalidateChannelData = () => {
    queryClient.invalidateQueries({
      queryKey: chatKeys.channels(activeChannel.spaceId),
    });
    queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
    if (activeChannel.isDefault) {
      queryClient.invalidateQueries({ queryKey: chatKeys.allSpaces() });
    }
  };

  const resetChannelUi = () => {
    dispatch(setActiveConversation(null));
    if (activeChannel.isDefault) {
      dispatch(setActiveSpaceId(null));
    }
    invalidateChannelData();
    onClose();
  };

  const leaveMutation = useMutation({
    mutationFn: () => leaveChannel(activeChannel.id),
    onSuccess: () => {
      toast.success(
        activeChannel.isDefault
          ? CHANNEL_ACTION_LABELS.leaveDefaultSuccess
          : CHANNEL_ACTION_LABELS.leaveSuccess,
      );
      resetChannelUi();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, CHANNEL_ACTION_LABELS.leaveFailed)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => disbandChannel(activeChannel.id),
    onSuccess: () => {
      toast.success(CHANNEL_ACTION_LABELS.deleteSuccess);
      resetChannelUi();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, CHANNEL_ACTION_LABELS.deleteFailed)),
  });

  const confirmLeaveChannel = async () => {
    const result = await Swal.fire({
      title: CHANNEL_ACTION_LABELS.leaveTitle(actionLabel),
      text: activeChannel.isDefault
        ? CHANNEL_ACTION_LABELS.leaveDefaultDescription
        : "Are you sure you want to leave this channel?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#3085d6",
      confirmButtonText: actionLabel,
      cancelButtonText: CHANNEL_ACTION_LABELS.cancel,
    });

    if (result.isConfirmed) {
      leaveMutation.mutate();
    }
  };

  const confirmDeleteChannel = async () => {
    const result = await Swal.fire({
      title: CHANNEL_ACTION_LABELS.deleteTitle,
      text: CHANNEL_ACTION_LABELS.deleteText,
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#3085d6",
      confirmButtonText: CHANNEL_ACTION_LABELS.deleteConfirm,
      cancelButtonText: CHANNEL_ACTION_LABELS.cancel,
    });

    if (result.isConfirmed) {
      deleteMutation.mutate();
    }
  };

  if (!currentUserId) return null;

  return (
    <div className="shrink-0 border-t border-gray-100 bg-white p-4">
      <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-red-500">
          Channel action
        </p>
        <p className="mt-1 text-xs text-red-500">{actionDescription}</p>

        {isResolvingAction ? (
          <div className="mt-3 h-9 rounded-lg bg-red-100/70 animate-pulse" />
        ) : canDeleteChannel ? (
          <div className="mt-3 flex gap-2">
            {canLeaveChannel && (
              <button
                type="button"
                onClick={confirmLeaveChannel}
                disabled={leaveMutation.isPending || deleteMutation.isPending}
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
              >
                <LogOut size={15} />
                {CHANNEL_ACTION_LABELS.leave}
              </button>
            )}
            <button
              type="button"
              onClick={confirmDeleteChannel}
              disabled={deleteMutation.isPending || leaveMutation.isPending}
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <Trash2 size={15} />
              {CHANNEL_ACTION_LABELS.delete}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={confirmLeaveChannel}
            disabled={leaveMutation.isPending}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
          >
            <LogOut size={15} />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

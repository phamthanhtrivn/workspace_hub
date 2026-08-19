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
  leaveChannel,
  getSpaceDetails,
} from "../../../api/chat.api";
import { chatKeys } from "../../../types/chat.constant";
import { ChannelResponse, SpaceRole } from "../../../types/chat.types";
import { getErrorMessage } from "../../../types/space-settings/space-settings.types";

interface ChannelActionsSectionProps {
  activeChannel: ChannelResponse;
  currentUserId: string | null;
  onClose: () => void;
}

const CHANNEL_ACTION_LABELS = {
  delete: "Delete channel",
  deleteFailed: "Failed to delete channel",
  deleteSuccess: "Channel deleted",
  deleteTitle: "Delete channel?",
  deleteConfirm: "Delete",
  deleteText: "This channel and its messages will be permanently deleted.",
  leave: "Leave channel",
  leaveDefault: "Leave space",
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
  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(activeChannel.spaceId),
    queryFn: async () => (await getSpaceDetails(activeChannel.spaceId)).data,
    enabled: !!activeChannel.spaceId,
  });

  const currentMember = activeChannel.members?.find(
    (member) => member.userId === currentUserId,
  );
  const isAdmin = currentMember?.role === SpaceRole.ADMIN;
  const isCreator = activeChannel.createdBy === currentUserId;
  const allowMemberDeleteOwnChannel =
    spaceDetail?.setting?.allowMemberDeleteOwnChannel ?? false;

  const canDeleteChannel =
    !activeChannel.isDefault &&
    (isAdmin || (isCreator && allowMemberDeleteOwnChannel));
  const canLeaveChannel = !activeChannel.isDefault || !isAdmin;
  const actionLabel = activeChannel.isDefault
    ? CHANNEL_ACTION_LABELS.leaveDefault
    : CHANNEL_ACTION_LABELS.leave;

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
  if (!canLeaveChannel && !canDeleteChannel) return null;

  return (
    <div className="shrink-0 border-t border-gray-100 bg-white p-4">
      {canDeleteChannel ? (
        <div className="flex flex-col gap-2">
          {canLeaveChannel && (
            <button
              type="button"
              onClick={confirmLeaveChannel}
              disabled={leaveMutation.isPending || deleteMutation.isPending}
              className="inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={15} />
              {CHANNEL_ACTION_LABELS.leave}
            </button>
          )}
          <button
            type="button"
            onClick={confirmDeleteChannel}
            disabled={deleteMutation.isPending || leaveMutation.isPending}
            className="inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

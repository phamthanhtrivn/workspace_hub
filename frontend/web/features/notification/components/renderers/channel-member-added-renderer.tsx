"use client";

import { useAppDispatch } from "@/store/store";
import { setActiveChat, setActiveSpaceId } from "@/store/chat/chat-slice";
import { ChatContextType } from "@/features/chat/types/chat.enums";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/date";
import { NotificationRendererProps } from "../notification-registry";
import { NotificationType } from "../../types/notification.types";

function ChannelMembershipModalRenderer({
  notification,
  onClose,
}: NotificationRendererProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isOwnershipTransfer =
    notification.type === NotificationType.CHANNEL_OWNERSHIP_TRANSFERRED;
  const metadata = notification.metadata;
  const channelId =
    typeof metadata?.channelId === "string" ? metadata.channelId : null;
  const spaceId =
    typeof metadata?.spaceId === "string" ? metadata.spaceId : null;
  const channelName =
    typeof metadata?.channelName === "string"
      ? metadata.channelName
      : "Private channel";
  const spaceName =
    typeof metadata?.spaceName === "string" ? metadata.spaceName : "Space";
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Lock size={24} className="shrink-0 text-primary" />
        <div>
          <h3 className="font-semibold">
            {isOwnershipTransfer
              ? "You are now a private channel owner"
              : "Added to a private channel"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatTimeAgo(new Date(notification.createdAt))}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{notification.content}</p>
      <dl className="space-y-2 rounded-panel border border-border p-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Channel</dt>
          <dd className="break-words font-medium">{channelName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Space</dt>
          <dd className="break-words">{spaceName}</dd>
        </div>
        {notification.senderName && (
          <div>
            <dt className="text-xs text-muted-foreground">
              {isOwnershipTransfer ? "Previous owner" : "Added by"}
            </dt>
            <dd>{notification.senderName}</dd>
          </div>
        )}
      </dl>
      <p className="text-xs text-muted-foreground">
        {isOwnershipTransfer
          ? "You can now manage this channel's members and settings."
          : "You can access this channel and its message history while you are a member."}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {channelId && spaceId && (
          <Button
            onClick={() => {
              dispatch(setActiveSpaceId(spaceId));
              dispatch(
                setActiveChat({
                  chatId: channelId,
                  chatType: ChatContextType.CHANNEL,
                }),
              );
              onClose();
              router.push(
                `/chat?spaceId=${encodeURIComponent(spaceId)}&channelId=${encodeURIComponent(channelId)}`,
              );
            }}
          >
            Open Channel
          </Button>
        )}
      </div>
    </div>
  );
}

export {
  ChannelMembershipModalRenderer as ChannelMemberAddedModalRenderer,
  ChannelMembershipModalRenderer as ChannelOwnershipTransferredModalRenderer,
};

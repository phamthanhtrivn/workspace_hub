import { Settings } from "lucide-react";
import { ChannelResponse } from "../../../types/chat.types";
import { useQuery } from "@tanstack/react-query";
import { getSpaceDetails } from "../../../api/chat.api";
import { chatKeys } from "../../../types/chat.constant";

interface ChannelSettingsSectionProps {
  activeChannel: ChannelResponse;
  currentUserId: string | null;
  onOpenSettings: () => void;
}

export default function ChannelSettingsSection({
  activeChannel,
  currentUserId,
  onOpenSettings,
}: ChannelSettingsSectionProps) {
  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(activeChannel.spaceId || ""),
    queryFn: async () => (await getSpaceDetails(activeChannel.spaceId!)).data,
    enabled: !!activeChannel.spaceId,
  });

  const spaceCreatorId = spaceDetail?.createdBy;
  const isOwner = spaceCreatorId === currentUserId;
  const isChannelCreator = activeChannel.createdBy === currentUserId;

  const currentMember = activeChannel.members?.find(
    (member) => member.userId === currentUserId,
  );
  const isSpaceAdmin = currentMember?.role === "ADMIN";
  const canOpenSettings = isSpaceAdmin || isChannelCreator || isOwner;

  return canOpenSettings ? (
    <div>
      <button
        type="button"
        onClick={onOpenSettings}
        className="w-full px-4 py-3 flex items-center justify-between transition cursor-pointer hover:bg-background"
      >
        <div className="flex items-center gap-3 text-foreground font-medium text-sm">
          <Settings size={18} className="text-muted-foreground" />
          Channel Settings
        </div>
      </button>
      <div className="h-px bg-muted mx-4 my-1" />
    </div>
  ) : null;
}

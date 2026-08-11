import { ArrowLeft, Info, Search, User } from "lucide-react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";

interface DirectConversationHeaderProps {
  onToggleRightPanel: () => void;
  onOpenSearch?: () => void;
  onBack?: () => void;
}

export default function DirectConversationHeader({
  onToggleRightPanel,
  onOpenSearch,
  onBack,
}: DirectConversationHeaderProps) {
  const { activeConversation, directMessages, memberProfiles } = useAppSelector(
    (state) => state.chat,
  );
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const dispatch = useAppDispatch();

  const otherMember = activeConversation?.members?.find(
    (member) => member.userId !== currentUserId,
  );
  const otherMemberId = otherMember?.userId ?? null;
  const profile = otherMemberId ? memberProfiles?.[otherMemberId] : null;
  const memberProfile = otherMember as any;
  const hasInlineProfile = !!(
    profile ||
    memberProfile?.profile?.fullName ||
    memberProfile?.fullName ||
    memberProfile?.profile?.avatarUrl ||
    memberProfile?.avatarUrl
  );
  const isLoadingProfile =
    !!otherMemberId &&
    !memberProfiles?.[otherMemberId] &&
    !hasInlineProfile &&
    directMessages.loading;
  const displayName =
    profile?.fullName ||
    memberProfile?.profile?.fullName ||
    memberProfile?.fullName ||
    "User";
  const displayAvatarUrl =
    profile?.avatarUrl ||
    memberProfile?.profile?.avatarUrl ||
    memberProfile?.avatarUrl ||
    null;

  return (
    <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {onBack && (
          <button
            className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
            onClick={onBack}
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <button
          type="button"
          className="relative cursor-pointer shrink-0"
          onClick={() => {
            if (otherMemberId) {
              dispatch(setSelectedProfileUserId(otherMemberId));
            }
          }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center font-bold overflow-hidden">
            {isLoadingProfile ? (
              <div className="h-full w-full animate-pulse rounded-full bg-gray-200" />
            ) : displayAvatarUrl ? (
              <Image
                src={displayAvatarUrl}
                alt="Avatar"
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <User size={20} className="text-gray-400" />
            )}
          </div>
        </button>

        <div className="min-w-0">
          {isLoadingProfile ? (
            <>
              <div className="mb-1 h-4 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
            </>
          ) : (
            <>
              <h2 className="font-semibold text-gray-800 truncate">
                {displayName}
              </h2>
              <p className="text-xs text-gray-500">Direct Message</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 text-gray-500">
        <button
          className="cursor-pointer p-2 hover:bg-gray-100 hover:text-blue-600 rounded-full transition"
          onClick={onOpenSearch}
          title="Search"
        >
          <Search size={20} />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          className="cursor-pointer p-2 hover:bg-gray-100 hover:text-blue-600 rounded-full transition"
          onClick={onToggleRightPanel}
          title="Conversation Info"
        >
          <Info size={20} />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";
import { useAppDispatch } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import ChannelMembersList from "./channel-members-list";
import { useChannelMembersSearch } from "@/features/chat/hooks/useChannelMembersSearch";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface ChannelMembersModalProps {
  channelId: string;
  fallbackMemberCount: number;
  isOpen: boolean;
  onClose: () => void;
  spaceCreatorId?: string | null;
}

export default function ChannelMembersModal({
  channelId,
  fallbackMemberCount,
  isOpen,
  onClose,
  spaceCreatorId,
}: ChannelMembersModalProps) {
  const intl = useAppIntl();
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const { membersResponse, isLoading, isFetching, isError } =
    useChannelMembersSearch({
      channelId,
      searchQuery,
      enabled: isOpen,
    });

  const admins = membersResponse?.admins ?? [];
  const members = membersResponse?.members ?? [];
  const memberList = useMemo(() => [...admins, ...members], [admins, members]);
  const memberCount = membersResponse?.total ?? fallbackMemberCount;
  const hasMembers = memberList.length > 0;

  const modalTitle = useMemo(
    () => intl.formatMessage({ id: "chat.membersCount" }, { count: memberCount }),
    [intl, memberCount],
  );

  const handleOpenProfile = (userId: string) => {
    dispatch(setSelectedProfileUserId(userId));
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-gray-900/40 px-4 py-6 backdrop-blur-sm transition-opacity duration-300">
      <div className="flex h-[680px] max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white text-gray-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/80 px-6 py-4 backdrop-blur-md">
          <h2 className="text-xl font-bold tracking-tight text-gray-800">
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label={intl.formatMessage({ id: "chat.closeChannelMembers" })}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/50 px-6 py-5">
          <label className="group relative block">
            <Search
              size={20}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500"
            />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={intl.formatMessage({ id: "chat.searchMembersByName" })}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-gray-700 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm font-medium text-gray-500">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <span>{intl.formatMessage({ id: "chat.loadingMembers" })}</span>
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center text-sm font-medium text-gray-500">
              {intl.formatMessage({ id: "chat.failedLoadChannelMembers" })}
            </div>
          ) : hasMembers ? (
            <div className="space-y-1">
              <ChannelMembersList
                members={memberList}
                onOpenProfile={handleOpenProfile}
                spaceCreatorId={spaceCreatorId}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-gray-500">
              {intl.formatMessage({ id: "chat.noMembers" })}
            </div>
          )}
        </div>

        {isFetching && !isLoading ? (
          <div className="border-t border-gray-100 bg-white px-6 py-2 text-xs font-medium text-gray-400">
            {intl.formatMessage({ id: "chat.loadingMembers" })}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";
import { useAppDispatch } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { useChannelMembersSearch } from "../../hooks/useChannelMembersSearch";
import { CHANNEL_MEMBERS_MODAL_LABELS } from "../../types/chat.constant";
import ChannelMembersList from "./channel-members-list";

interface ChannelMembersModalProps {
  channelId: string;
  fallbackMemberCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChannelMembersModal({
  channelId,
  fallbackMemberCount,
  isOpen,
  onClose,
}: ChannelMembersModalProps) {
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
  const memberCount = membersResponse?.total ?? fallbackMemberCount;
  const hasMembers = admins.length > 0 || members.length > 0;

  const modalTitle = useMemo(
    () => CHANNEL_MEMBERS_MODAL_LABELS.title(memberCount),
    [memberCount],
  );

  const handleOpenProfile = (userId: string) => {
    dispatch(setSelectedProfileUserId(userId));
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="flex h-[680px] max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="text-base font-bold text-slate-100">{modalTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
            aria-label="Close channel members"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-800 px-5 py-4">
          <label className="relative block">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={CHANNEL_MEMBERS_MODAL_LABELS.searchPlaceholder}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 pl-10 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-color:#475569_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 size={22} className="animate-spin text-sky-400" />
              <span>{CHANNEL_MEMBERS_MODAL_LABELS.loading}</span>
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              {CHANNEL_MEMBERS_MODAL_LABELS.loadError}
            </div>
          ) : hasMembers ? (
            <div className="space-y-7">
              <ChannelMembersList
                title={CHANNEL_MEMBERS_MODAL_LABELS.adminsSection}
                members={admins}
                onOpenProfile={handleOpenProfile}
              />
              <ChannelMembersList
                title={CHANNEL_MEMBERS_MODAL_LABELS.membersSection}
                members={members}
                onOpenProfile={handleOpenProfile}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              {CHANNEL_MEMBERS_MODAL_LABELS.empty}
            </div>
          )}
        </div>

        {isFetching && !isLoading ? (
          <div className="border-t border-slate-800 px-5 py-2 text-xs text-slate-500">
            {CHANNEL_MEMBERS_MODAL_LABELS.loading}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  MessageSquare,
  MessageSquareText,
  Search,
  User,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { formatDateTime } from "@/lib/date";
import {
  getFollowedChannelThreads,
  getFollowedDirectThreads,
} from "../../api/chat.api";
import {
  ChatContextType,
  FollowedThreadResponse,
} from "../../types/chat.types";
import {
  chatKeys,
  MAX_UNREAD_COUNT,
} from "../../types/chat.constant";
import { useAppIntl } from "@/features/i18n/useAppIntl";

const EMPTY_THREADS: FollowedThreadResponse[] = [];

interface FollowedThreadsModalProps {
  currentUserId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectThread: (thread: FollowedThreadResponse) => void;
}

export function getThreadSortDate(thread: FollowedThreadResponse) {
  return new Date(thread.lastReplyAt ?? thread.rootMessage.createdAt).getTime();
}

export function getThreadPreview(
  thread: FollowedThreadResponse,
  attachmentFallback = "[Attachment]",
) {
  return thread.rootMessage.content?.trim() || attachmentFallback;
}

export async function fetchFollowedThreads() {
  const [channelThreadsResponse, directThreadsResponse] = await Promise.all([
    getFollowedChannelThreads(),
    getFollowedDirectThreads(),
  ]);

  const channelThreads = channelThreadsResponse.success
    ? channelThreadsResponse.data
    : EMPTY_THREADS;
  const directThreads = directThreadsResponse.success
    ? directThreadsResponse.data
    : EMPTY_THREADS;

  return [...channelThreads, ...directThreads].sort(
    (firstThread, secondThread) =>
      getThreadSortDate(secondThread) - getThreadSortDate(firstThread),
  );
}

export default function FollowedThreadsModal({
  currentUserId,
  isOpen,
  onClose,
  onSelectThread,
}: FollowedThreadsModalProps) {
  const intl = useAppIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    data = EMPTY_THREADS,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: chatKeys.followedThreads(currentUserId),
    queryFn: fetchFollowedThreads,
    enabled: !!currentUserId,
    staleTime: 1000 * 30,
  });

  const handleClose = useCallback(() => {
    setSearchQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isOpen]);

  const filteredThreads = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) return data;

    return data.filter((thread) => {
      const senderName = thread.rootMessage.senderProfile?.fullName || "";
      const chatName =
        thread.chatType === ChatContextType.CHANNEL
          ? thread.chatName || thread.chat.name || ""
          : thread.chat.members
              ?.map((member) => member.profile?.fullName || "")
              .join(" ") || "";

      return `${chatName} ${senderName} ${getThreadPreview(
        thread,
        intl.formatMessage({ id: "chat.attachment" }),
      )}`
        .toLowerCase()
        .includes(trimmedQuery);
    });
  }, [data, intl, searchQuery]);

  const handleSelectThread = (thread: FollowedThreadResponse) => {
    onSelectThread(thread);
    handleClose();
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl max-h-[86vh] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <MessageSquareText size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate">
                {intl.formatMessage({ id: "chat.threads" })}
              </h2>
              <p className="text-xs text-slate-500">
                {intl.formatMessage({ id: "chat.followedThreadDiscussions" })}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
            title={intl.formatMessage({ id: "app.close" })}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={intl.formatMessage({
                id: "chat.searchFollowedThreads",
              })}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl outline-none transition"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 bg-white">
          {isLoading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <p className="text-sm font-medium">
                {intl.formatMessage({ id: "chat.loadingThreads" })}
              </p>
            </div>
          ) : isError ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-center px-6">
              <p className="text-sm font-semibold text-slate-700">
                {intl.formatMessage({ id: "chat.failedLoadFollowedThreads" })}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
              >
                {intl.formatMessage({ id: "app.tryAgain" })}
              </button>
            </div>
          ) : filteredThreads.length > 0 ? (
            <div className="flex flex-col gap-1">
              {filteredThreads.map((thread) => {
                const senderProfile = thread.rootMessage.senderProfile;
                const senderName = senderProfile?.fullName || "User";
                const lastReplyTime = thread.lastReplyAt
                  ? formatDateTime(thread.lastReplyAt)
                  : null;

                return (
                  <button
                    key={`${thread.chatType}-${thread.rootMessage.id}`}
                    onClick={() => handleSelectThread(thread)}
                    className="w-full cursor-pointer rounded-xl border border-slate-100 p-3 text-left hover:border-blue-100 hover:bg-blue-50/20 transition flex flex-col gap-2"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex items-center gap-2">
                        <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-slate-100 flex items-center justify-center">
                          {senderProfile?.avatarUrl ? (
                            <Image
                              src={senderProfile.avatarUrl}
                              alt={senderName}
                              width={24}
                              height={24}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <User size={12} className="text-slate-400" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-slate-800">
                            {senderName}
                          </span>
                        </span>
                      </span>
                      {thread.unreadReplyCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[22px] text-center shrink-0">
                          {thread.unreadReplyCount > MAX_UNREAD_COUNT
                            ? "99+"
                            : thread.unreadReplyCount}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-600 line-clamp-2 break-words">
                      {getThreadPreview(
                        thread,
                        intl.formatMessage({ id: "chat.attachment" }),
                      )}
                    </span>
                    <span className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100/50 mt-1 shrink-0">
                      <span className="flex items-center gap-1 text-blue-600 font-bold">
                        <MessageSquare size={11} />
                        {intl.formatMessage(
                          { id: "chat.repliesCount" },
                          { count: thread.replyCount },
                        )}
                      </span>
                      {lastReplyTime && (
                        <span>
                          {intl.formatMessage(
                            { id: "chat.lastReplyAt" },
                            { time: lastReplyTime },
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center px-6">
              <p className="text-sm font-semibold text-slate-700">
                {intl.formatMessage({ id: "chat.noFollowedThreads" })}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {intl.formatMessage({ id: "chat.followThreadHint" })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

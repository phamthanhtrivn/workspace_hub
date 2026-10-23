"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import { useCallback, useMemo, useState } from "react";

import {
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

import ThreadSnippetPreview, {
  formatThreadSnippet,
} from "../right-panel/thread/thread-snippet-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogSurface } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";


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
  const snippet = formatThreadSnippet(thread.rootMessage.content);
  if (snippet.isTask) {
    return `${snippet.title} ${snippet.tag || ""}`.trim();
  }
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
        "[Attachment]",
      )}`
        .toLowerCase()
        .includes(trimmedQuery);
    });
  }, [data, searchQuery]);

  const handleSelectThread = (thread: FollowedThreadResponse) => {
    onSelectThread(thread);
    handleClose();
  };

  if (!isOpen || typeof document === "undefined") return null;

  return <DialogSurface onClose={handleClose}>{<div data-ui-interaction-exception="Backdrop dismissal; close button and Escape are available."
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-overlay/45 p-4 animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div data-ui-interaction-exception="Propagation boundary; no action."
        className={`${dialogLayout.surface} w-full max-w-2xl max-h-[86vh] bg-card rounded-panel border border-border overflow-hidden flex flex-col animate-in zoom-in-95 duration-150`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-panel bg-info-soft text-info-content flex items-center justify-center shrink-0">
              <MessageSquareText size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-section-title font-semibold text-foreground truncate">
                Followed Threads
              </h2>
              <p className="text-xs text-muted-foreground">
                Threads you are participating in or following
              </p>
            </div>
          </div>
          <Button variant="unstyled"
            onClick={handleClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="px-5 py-4 border-b border-border bg-background">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input aria-label="Search followed threads" unstyled
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search followed threads..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-input focus:border-info-outline focus:ring-4 focus:ring-ring rounded-control outline-none transition"
            />
          </div>
        </div>

        <div className={`${dialogLayout.body} flex-1 min-h-0 overflow-y-auto p-3 bg-card`}>
          {isLoading ? (
            <div role="status" className="h-48 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Spinner size={24} />
              <p className="text-sm font-medium">
                Loading threads...
              </p>
            </div>
          ) : isError ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-center px-6">
              <p className="text-sm font-semibold text-foreground">
                Failed to load followed threads
              </p>
              <Button variant="info-soft"
                onClick={() => refetch()}
                className="px-4 py-2 text-xs font-semibold rounded-control transition cursor-pointer"
              >
                Try Again
              </Button>
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
                  <Button variant="unstyled"
                    key={`${thread.chatType}-${thread.rootMessage.id}`}
                    onClick={() => handleSelectThread(thread)}
                    className="w-full cursor-pointer rounded-control border border-border p-3 text-left hover:border-border hover:bg-info-soft/20 transition flex flex-col gap-2"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex items-center gap-2">
                        <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                          {senderProfile?.avatarUrl ? (
                            <Image
                              src={senderProfile.avatarUrl}
                              alt={senderName}
                              width={24}
                              height={24}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <User size={12} className="text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-foreground">
                            {senderName}
                          </span>
                        </span>
                      </span>
                      {thread.unreadReplyCount > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-0.5 rounded-full min-w-[22px] text-center shrink-0">
                          {thread.unreadReplyCount > MAX_UNREAD_COUNT
                            ? "99+"
                            : thread.unreadReplyCount}
                        </span>
                      )}
                    </span>
                    <ThreadSnippetPreview content={thread.rootMessage.content} />
                    <span className="flex items-center justify-between text-xs text-muted-foreground font-semibold pt-1 border-t border-border mt-1 shrink-0">
                      <span className="flex items-center gap-1 text-info-content font-semibold">
                        <MessageSquare size={11} />
                        {`${thread.replyCount} replies`}
                      </span>
                      {lastReplyTime && (
                        <span>
                          {`Last reply: ${lastReplyTime}`}
                        </span>
                      )}
                    </span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center px-6">
              <p className="text-sm font-semibold text-foreground">
                No followed threads found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Reply to a message thread to automatically follow it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>}</DialogSurface>;
}


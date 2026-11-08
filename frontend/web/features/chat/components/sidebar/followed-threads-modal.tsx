"use client";

import { UserAvatar } from "@/components/common/user-avatar";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import { useCallback, useMemo, useState } from "react";

import { MessageSquare, MessageSquareText, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { formatDateTime } from "@/lib/date";
import {
  getFollowedChannelThreads,
  getFollowedDirectThreads,
} from "../../api/chat.api";
import {
  ChatContextType,
  FollowedThreadResponse,
} from "../../types/chat.types";
import { chatKeys, MAX_UNREAD_COUNT } from "../../types/chat.constant";

import ThreadSnippetPreview, {
  formatThreadSnippet,
} from "../right-panel/thread/thread-snippet-preview";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { DialogSurface } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { QueryFeedback } from "@/components/common/query-feedback";
import { useThreadDocumentMetadata } from "../../hooks/useThreadDocumentMetadata";
import {
  formatThreadReplyCount,
  threadSnippetSearchText,
  type ThreadDocumentMetadata,
} from "../../utils/thread-snippet";

const EMPTY_THREADS: FollowedThreadResponse[] = [];
const FOLLOWED_THREADS_ERROR_MESSAGE = "Failed to load followed threads";

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
  thread: Pick<FollowedThreadResponse, "rootMessage">,
  documentMetadata?: ThreadDocumentMetadata | null,
) {
  return threadSnippetSearchText(
    formatThreadSnippet(
      thread.rootMessage.content,
      thread.rootMessage,
      documentMetadata,
    ),
  );
}

export async function fetchFollowedThreads() {
  const [channelThreadsResponse, directThreadsResponse] = await Promise.all([
    getFollowedChannelThreads(),
    getFollowedDirectThreads(),
  ]);

  if (!channelThreadsResponse.success || !directThreadsResponse.success) {
    throw new Error(FOLLOWED_THREADS_ERROR_MESSAGE);
  }

  return [...channelThreadsResponse.data, ...directThreadsResponse.data].sort(
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
    isFetching,
    refetch,
  } = useQuery({
    queryKey: chatKeys.followedThreads(currentUserId),
    queryFn: fetchFollowedThreads,
    enabled: !!currentUserId,
    staleTime: 1000 * 30,
  });

  const rootMessages = useMemo(
    () => data.map((thread) => thread.rootMessage),
    [data],
  );
  const documentMetadata = useThreadDocumentMetadata(
    rootMessages,
    isOpen && !!currentUserId,
  );

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
        documentMetadata.get(thread.rootMessage.content?.trim() || ""),
      )}`
        .toLowerCase()
        .includes(trimmedQuery);
    });
  }, [data, searchQuery, documentMetadata]);

  const handleSelectThread = (thread: FollowedThreadResponse) => {
    onSelectThread(thread);
    handleClose();
  };

  if (!isOpen || typeof document === "undefined") return null;

  return (
    <DialogSurface onClose={handleClose}>
      {
        <div
          data-ui-interaction-exception="Backdrop dismissal; close button and Escape are available."
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-overlay/45 p-4 animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div
            data-ui-interaction-exception="Propagation boundary; no action."
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
              <Button
                variant="unstyled"
                aria-label="Close followed threads"
                onClick={handleClose}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </Button>
            </div>

            <div className="px-5 py-4 border-b border-border bg-background">
              <div className="relative">
                <SearchInput
                  aria-label="Search followed threads"
                  unstyled
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search followed threads..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-input rounded-control outline-none transition"
                />
              </div>
            </div>

            <div
              className={`${dialogLayout.body} flex-1 min-h-0 overflow-y-auto p-3 bg-card`}
            >
              {isError && data.length > 0 && (
                <QueryFeedback
                  label="followed threads"
                  error
                  retrying={isFetching}
                  onRetry={() => refetch()}
                />
              )}
              {isLoading ? (
                <div
                  role="status"
                  className="h-48 flex flex-col items-center justify-center gap-3 text-muted-foreground"
                >
                  <Spinner size={24} />
                  <p className="text-sm font-medium">Loading threads...</p>
                </div>
              ) : isError && data.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3 text-center px-6">
                  <p className="text-sm font-semibold text-foreground">
                    {FOLLOWED_THREADS_ERROR_MESSAGE}
                  </p>
                  <Button
                    variant="info-soft"
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
                      <Button
                        variant="unstyled"
                        key={`${thread.chatType}-${thread.rootMessage.id}`}
                        onClick={() => handleSelectThread(thread)}
                        className="min-w-0 w-full cursor-pointer rounded-control border border-border p-3 text-left hover:border-border hover:bg-info-soft/20 transition flex flex-col items-stretch gap-2 whitespace-normal"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex items-center gap-2">
                            <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                              <UserAvatar
                                src={senderProfile?.avatarUrl}
                                alt={senderName}
                                width={24}
                                height={24}
                                className="h-6 w-6 rounded-full object-cover"
                              />
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
                        <ThreadSnippetPreview
                          content={thread.rootMessage.content}
                          message={thread.rootMessage}
                          documentMetadata={documentMetadata.get(
                            thread.rootMessage.content?.trim() || "",
                          )}
                        />
                        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground font-semibold pt-1 border-t border-border mt-1 shrink-0">
                          <span className="flex items-center gap-1 text-info-content font-semibold">
                            <MessageSquare size={11} />
                            {formatThreadReplyCount(thread.replyCount)}
                          </span>
                          {lastReplyTime && (
                            <span>{`Last reply: ${lastReplyTime}`}</span>
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
                    {searchQuery.trim()
                      ? "Try another filename, sender or conversation."
                      : "Reply to a message thread to automatically follow it."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      }
    </DialogSurface>
  );
}

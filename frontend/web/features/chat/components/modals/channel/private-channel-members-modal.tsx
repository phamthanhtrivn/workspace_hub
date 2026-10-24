"use client";

import { useRef } from "react";
import { Search, Trash2 } from "lucide-react";
import { useAppDispatch } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { ChannelResponse } from "../../../types/chat.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { SimplePagination } from "@/components/ui/custom/simple-pagination";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import ChatConfirmDialog from "../../ui/chat-confirm-dialog";
import ChannelJoinedBadge from "../../ui/channel-joined-badge";
import ChannelMemberRow from "./channel-member-row";
import { useChatConfirmDialog } from "../../../hooks/useChatConfirmDialog";
import { usePrivateChannelMembers } from "../../../hooks/usePrivateChannelMembers";

interface PrivateChannelMembersModalProps {
  channel: ChannelResponse;
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivateChannelMembersModal(
  props: PrivateChannelMembersModalProps,
) {
  return props.isOpen ? <PrivateChannelMembersContent {...props} /> : null;
}

function PrivateChannelMembersContent({
  channel,
  onClose,
}: PrivateChannelMembersModalProps) {
  const dispatch = useAppDispatch();
  const listRef = useRef<HTMLDivElement>(null);
  const { confirm, confirmDialogProps } = useChatConfirmDialog();
  const {
    data,
    members,
    pagination,
    canManage,
    isLoading,
    isSearching,
    isFetching,
    isError,
    refetch,
    search,
    setSearch,
    setPage,
    membership,
  } = usePrivateChannelMembers(channel);
  const busy = membership.isPending;
  const changePage = (nextPage: number) => {
    setPage(nextPage);
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
      >
        <DialogContent
          className={`${dialogLayout.surface} h-[680px] max-w-md gap-0 rounded-panel bg-card p-0`}
          showCloseButton={!busy}
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>
              {data?.memberCount ?? channel.members.length} Members
            </DialogTitle>
          </DialogHeader>
          <div className="shrink-0 border-b border-border px-6 py-5">
            <label className="relative block">
              <Search
                size={20}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search members by name or email"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  changePage(1);
                }}
                maxLength={100}
                placeholder="Search members by name..."
                className="pl-11"
              />
            </label>
          </div>
          <div
            ref={listRef}
            aria-busy={isLoading || isFetching}
            className={`${dialogLayout.body} space-y-1 px-4 py-4`}
          >
            {isLoading ? (
              <p role="status" className="p-3 text-sm text-muted-foreground">
                Loading members...
              </p>
            ) : isError ? (
              <div className="p-3">
                <p role="alert" className="text-sm text-destructive-content">
                  Could not load channel members.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : members.length ? (
              members.map((member) => (
                <ChannelMemberRow
                  key={member.userId}
                  member={member}
                  spaceCreatorId={data?.ownerId}
                  onOpenProfile={(userId) =>
                    dispatch(setSelectedProfileUserId(userId))
                  }
                  actions={
                    canManage ? (
                      member.joined ? (
                        <>
                          <ChannelJoinedBadge />
                          {member.userId !== data?.ownerId && (
                            <IconButton
                              variant="outline"
                              size="icon-sm"
                              className="text-destructive-content hover:bg-destructive-soft hover:text-destructive-content"
                              label={`Remove ${member.profile?.fullName || member.profile?.email || member.userId}`}
                              disabled={busy || isFetching}
                              loading={
                                busy &&
                                membership.variables?.userId === member.userId
                              }
                              onClick={async () => {
                                if (
                                  await confirm({
                                    title: "Remove channel member?",
                                    description:
                                      "This member will lose access to this private channel.",
                                    confirmLabel: "Remove",
                                    cancelLabel: "Cancel",
                                    variant: "danger",
                                  })
                                )
                                  membership.mutate({
                                    userId: member.userId,
                                    joined: true,
                                  });
                              }}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </IconButton>
                          )}
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          aria-label={`Add ${member.profile?.fullName || member.profile?.email || member.userId}`}
                          disabled={busy || isFetching}
                          loading={
                            busy &&
                            membership.variables?.userId === member.userId
                          }
                          onClick={() =>
                            membership.mutate({
                              userId: member.userId,
                              joined: false,
                            })
                          }
                        >
                          Add
                        </Button>
                      )
                    ) : undefined
                  }
                />
              ))
            ) : (
              <p className="p-3 text-sm text-muted-foreground">
                No members match your search.
              </p>
            )}
          </div>
          {!isError && !isSearching && pagination && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border px-4 py-2">
              <p role="status" className="text-xs text-muted-foreground">
                {pagination.total
                  ? (pagination.page - 1) * pagination.pageSize + 1
                  : 0}
                –
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total,
                )}{" "}
                of {pagination.total}
              </p>
              <SimplePagination
                compact
                page={pagination.page}
                totalPages={pagination.totalPages}
                isLoading={busy || isFetching}
                onPageChange={changePage}
                ariaLabel="Private channel member pages"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ChatConfirmDialog
        {...confirmDialogProps}
        overlayClassName="z-[120]"
        className="z-[130]"
      />
    </>
  );
}

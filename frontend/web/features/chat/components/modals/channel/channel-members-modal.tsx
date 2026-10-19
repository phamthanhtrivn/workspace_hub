"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import { useEffect, useMemo, useState } from "react";

import { Loader2, Search, X } from "lucide-react";
import { useAppDispatch } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import ChannelMembersList from "./channel-members-list";
import { useChannelMembersSearch } from "@/features/chat/hooks/useChannelMembersSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogSurface } from "@/components/ui/dialog";


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

  const modalTitle = `${memberCount} Members`;

  const handleOpenProfile = (userId: string) => {
    dispatch(setSelectedProfileUserId(userId));
  };

  if (!isOpen || !mounted) return null;

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-[9998] flex items-center justify-center bg-overlay/40 px-4 py-6 transition-opacity duration-200">
      <div className={`${dialogLayout.surface} flex h-[680px] max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-panel border border-border bg-card text-foreground animate-in fade-in zoom-in-95 duration-200`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-section-title font-semibold tracking-tight text-foreground">
            {modalTitle}
          </h2>
          <Button variant="unstyled"
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close channel members"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="flex-shrink-0 border-b border-border bg-background px-6 py-5">
          <label className="group relative block">
            <Search
              size={20}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-info-content"
            />
            <Input unstyled
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search members by name..."
              className="w-full rounded-control border border-input bg-card py-3 pl-11 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-info-outline focus:ring-4 focus:ring-ring"
            />
          </label>
        </div>

        <div className={`${dialogLayout.body} min-h-0 flex-1 overflow-y-auto bg-card px-4 py-4`}>
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm font-medium text-muted-foreground">
              <Loader2 size={24} className="animate-spin text-info-content" />
              <span>Loading members...</span>
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
              Failed to load channel members
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
            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
              No members found
            </div>
          )}
        </div>

        {isFetching && !isLoading ? (
          <div className="border-t border-border bg-card px-6 py-2 text-xs font-medium text-muted-foreground">
            Loading members...
          </div>
        ) : null}
      </div>
    </div>}</DialogSurface>;
}


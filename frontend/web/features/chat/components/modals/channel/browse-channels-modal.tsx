"use client";

import { IconButton } from "@/components/ui/icon-button";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState, useEffect } from "react";

import { X, Loader2, Search, Hash, Check, Globe, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ChatConfirmDialog from "@/features/chat/components/ui/chat-confirm-dialog";
import { useChatConfirmDialog } from "@/features/chat/hooks/useChatConfirmDialog";
import { getSpaceDetails } from "@/features/chat/api/space.api";
import { chatKeys } from "@/features/chat/types/chat.constant";
import { useSpaceChannelsQuery } from "@/features/chat/hooks/useChatQueries";
import { disbandChannel, joinChannel } from "@/features/chat/api/channel.api";
import { removeChannelFromCaches } from "@/features/chat/utils/chat-cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogSurface } from "@/components/ui/dialog";


interface BrowseChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  currentUserId: string | null;
  isSpaceAdmin?: boolean;
  onJoinSuccess?: (channel: any) => void;
  onDeleteSuccess?: (channelId: string) => void;
}

export default function BrowseChannelsModal({
  isOpen,
  onClose,
  spaceId,
  currentUserId,
  isSpaceAdmin = false,
  onJoinSuccess,
  onDeleteSuccess,
}: BrowseChannelsModalProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const { confirm: confirmAction, confirmDialogProps } = useChatConfirmDialog();

  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(spaceId),
    queryFn: async () => (await getSpaceDetails(spaceId)).data,
    enabled: isOpen && !!spaceId,
  });
  const allowMemberDeleteOwnChannel =
    spaceDetail?.setting?.allowMemberDeleteOwnChannel ?? false;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch all channels in the space
  const {
    data: channelsData,
    isLoading,
    refetch,
  } = useSpaceChannelsQuery(spaceId, debouncedSearchQuery, {
    enabled: isOpen && !!spaceId,
  });

  const channels = channelsData?.channels || [];

  const joinMutation = useMutation({
    mutationFn: (channelId: string) => joinChannel(channelId),
    onSuccess: (response, channelId) => {
      toast.success("Joined channel successfully");
      queryClient.invalidateQueries({ queryKey: chatKeys.channels(spaceId) });

      const joinedChannel =
        response?.success && response.data
          ? response.data
          : channels.find((c: any) => c.id === channelId);
      if (joinedChannel && onJoinSuccess) {
        onJoinSuccess(joinedChannel);
      }
      onClose();
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Failed to join channel",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (channelId: string) => disbandChannel(channelId),
    onSuccess: (_response, channelId) => {
      toast.success("Channel deleted successfully");
      removeChannelFromCaches(queryClient, channelId);
      queryClient.invalidateQueries({ queryKey: chatKeys.channels(spaceId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
      onDeleteSuccess?.(channelId);
      refetch();
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Failed to delete channel",
      );
    },
  });

  const handleDeleteChannel = async (channelId: string) => {
    const confirmed = await confirmAction({
      title: "Delete Channel",
      description: "Are you sure you want to delete this channel? All messages and attachments will be lost.",
      variant: "danger",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });

    if (confirmed) {
      deleteMutation.mutate(channelId);
    }
  };

  const filteredChannels = channels;

  if (!isOpen || !mounted) return null;

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/40 animate-fade-in">
      <div className={`${dialogLayout.surface} w-full max-w-lg bg-card rounded-panel overflow-hidden border border-border flex flex-col h-[600px] max-h-[100vh]`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="text-info-content" size={20} />
            <h2 className="text-section-title font-semibold text-foreground">
              Browse Channels
            </h2>
          </div>
          <IconButton label="Close" showTooltip={false} size="icon-sm" aria-label="Close"
            onClick={onClose}
            className="p-1 rounded-control text-muted-foreground hover:text-muted-foreground hover:bg-muted transition cursor-pointer"
          >
            <X size={20} />
          </IconButton>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border bg-background">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input aria-label="Search channels by name" unstyled
              type="text"
              placeholder="Search channels by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-input focus:border-info-outline focus:ring-4 focus:ring-ring rounded-control text-sm outline-none transition duration-150"
            />
          </div>
        </div>

        {/* Channel List */}
        <div className={`${dialogLayout.body} flex-1 overflow-y-auto p-4 flex flex-col gap-2`}>
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="animate-spin text-info-content" size={24} />
              <span className="text-xs">Loading channels...</span>
            </div>
          ) : filteredChannels.length > 0 ? (
            filteredChannels.map((channel: any) => {
              const isJoined = channel.members?.some(
                (m: any) => m.userId === currentUserId,
              );
              const memberCount = channel.members?.length || 0;

              return (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-3.5 hover:bg-background border border-border hover:border-border rounded-panel transition duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-panel bg-muted text-muted-foreground">
                      <Hash size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {channel.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {`${memberCount} members`}
                        {channel.isDefault && (
                          <span className="ml-2 px-1.5 py-0.5 bg-info-soft text-info-content rounded text-xs font-semibold">
                            Default
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isJoined ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-success-content bg-success-soft rounded-lg border border-border">
                        <Check size={14} />
                        Joined
                      </span>
                    ) : (
                      <Button variant="default"
                        onClick={() => joinMutation.mutate(channel.id)}
                        disabled={joinMutation.isPending}
                        className="px-4 py-1.5 text-xs font-semibold disabled:bg-primary rounded-control transition cursor-pointer flex items-center gap-1"
                      >
                        {joinMutation.isPending &&
                        joinMutation.variables === channel.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : null}
                        Join
                      </Button>
                    )}
                    {(isSpaceAdmin ||
                      (channel.createdBy === currentUserId &&
                        allowMemberDeleteOwnChannel)) &&
                      !channel.isDefault && (
                        <Button variant="unstyled"
                          type="button"
                          onClick={() => handleDeleteChannel(channel.id)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-border bg-destructive-soft text-destructive-content hover:bg-destructive-soft hover:text-destructive-content disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                          title="Delete Channel"
                        >
                          {deleteMutation.isPending &&
                          deleteMutation.variables === channel.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </Button>
                      )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground italic text-xs py-10">
              No channels found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-background flex justify-end">
          <Button variant="unstyled"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-muted border border-border rounded-control transition cursor-pointer"
          >
            Close
          </Button>
        </div>
      </div>
      <ChatConfirmDialog {...confirmDialogProps} />
    </div>}</DialogSurface>;
}


"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Search, Hash, Check, Globe, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { getSpaceDetails } from "@/features/chat/api/space.api";
import { chatKeys } from "@/features/chat/types/chat.constant";
import { useSpaceChannelsQuery } from "@/features/chat/hooks/useChatQueries";
import { disbandChannel, joinChannel } from "@/features/chat/api/channel.api";
import { removeChannelFromCaches } from "@/features/chat/utils/chat-cache";
import { useAppIntl } from "@/features/i18n/useAppIntl";

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
  const intl = useAppIntl();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

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
      toast.success(intl.formatMessage({ id: "chat.joinedChannel" }));
      // Invalidate queries to refresh sidebar and modal lists
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
        err.response?.data?.message ||
          intl.formatMessage({ id: "chat.joinChannelFailed" }),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (channelId: string) => disbandChannel(channelId),
    onSuccess: (_response, channelId) => {
      toast.success(intl.formatMessage({ id: "chat.channelDeleted" }));
      removeChannelFromCaches(queryClient, channelId);
      queryClient.invalidateQueries({ queryKey: chatKeys.channels(spaceId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
      onDeleteSuccess?.(channelId);
      refetch();
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message ||
          intl.formatMessage({ id: "chat.deleteChannelFailed" }),
      );
    },
  });

  const handleDeleteChannel = async (channelId: string) => {
    const result = await Swal.fire({
      title: intl.formatMessage({ id: "chat.deleteChannelTitle" }),
      text: intl.formatMessage({ id: "chat.deleteChannelDescription" }),
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#3085d6",
      confirmButtonText: intl.formatMessage({ id: "app.delete" }),
      cancelButtonText: intl.formatMessage({ id: "app.cancel" }),
    });

    if (result.isConfirmed) {
      deleteMutation.mutate(channelId);
    }
  };

  const filteredChannels = channels;

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-[600px] max-h-[100vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="text-blue-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">
              {intl.formatMessage({ id: "chat.browseChannels" })}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder={intl.formatMessage({
                id: "chat.searchChannelsByName",
              })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl text-sm outline-none transition duration-150 shadow-sm"
            />
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-250 [&::-webkit-scrollbar-thumb]:rounded-full">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Loader2 className="animate-spin text-blue-500" size={24} />
              <span className="text-xs">
                {intl.formatMessage({ id: "chat.loadingChannels" })}
              </span>
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
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 border border-gray-100 hover:border-blue-100/50 rounded-xl transition duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Hash size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {channel.name}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {intl.formatMessage(
                          { id: "chat.membersCount" },
                          { count: memberCount },
                        )}
                        {channel.isDefault && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold">
                            {intl.formatMessage({ id: "chat.default" })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isJoined ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100/50">
                        <Check size={14} />
                        {intl.formatMessage({ id: "chat.joined" })}
                      </span>
                    ) : (
                      <button
                        onClick={() => joinMutation.mutate(channel.id)}
                        disabled={joinMutation.isPending}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-sm shadow-blue-50 transition cursor-pointer flex items-center gap-1"
                      >
                        {joinMutation.isPending &&
                        joinMutation.variables === channel.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : null}
                        {intl.formatMessage({ id: "chat.join" })}
                      </button>
                    )}
                    {(isSpaceAdmin ||
                      (channel.createdBy === currentUserId &&
                        allowMemberDeleteOwnChannel)) &&
                      !channel.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteChannel(channel.id)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                          title={intl.formatMessage({
                            id: "chat.deleteChannel",
                          })}
                        >
                          {deleteMutation.isPending &&
                          deleteMutation.variables === channel.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 italic text-xs py-10">
              {intl.formatMessage({ id: "chat.noChannelsFound" })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer"
          >
            {intl.formatMessage({ id: "app.close" })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

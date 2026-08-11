"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Search, Hash, Check, Globe } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSpaceChannels, joinChannel } from "../../api/chat.api";
import { toast } from "react-toastify";

interface BrowseChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  currentUserId: string | null;
  onJoinSuccess?: (channel: any) => void;
}

export default function BrowseChannelsModal({
  isOpen,
  onClose,
  spaceId,
  currentUserId,
  onJoinSuccess,
}: BrowseChannelsModalProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

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
    data: channelsRes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["channels", spaceId, debouncedSearchQuery],
    queryFn: () => getSpaceChannels(spaceId, debouncedSearchQuery),
    enabled: isOpen && !!spaceId,
    staleTime: 1000 * 10,
  });

  const channels = useMemo(() => {
    if (channelsRes?.success && Array.isArray(channelsRes.data)) {
      return channelsRes.data;
    }
    if (Array.isArray(channelsRes)) {
      return channelsRes;
    }
    return [];
  }, [channelsRes]);

  const joinMutation = useMutation({
    mutationFn: (channelId: string) => joinChannel(channelId),
    onSuccess: (data, channelId) => {
      toast.success("Joined channel successfully!");
      // Invalidate queries to refresh sidebar and modal lists
      queryClient.invalidateQueries({ queryKey: ["channels", spaceId] });

      const joinedChannel = channels.find((c: any) => c.id === channelId);
      if (joinedChannel && onJoinSuccess) {
        onJoinSuccess(joinedChannel);
      }
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to join channel");
    },
  });

  const filteredChannels = channels;

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-[600px] max-h-[100vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="text-blue-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Browse channels</h2>
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
              placeholder="Search channels by name..."
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
                        {memberCount} {memberCount === 1 ? "member" : "members"}
                        {channel.isDefault && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold">
                            Default
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isJoined ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100/50">
                        <Check size={14} />
                        Joined
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
                        Join
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 italic text-xs py-10">
              No channels found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

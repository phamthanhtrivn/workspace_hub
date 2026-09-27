"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Sparkles, UserCheck, Hash, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSpaceChannels } from "@/features/chat/api/space.api";
import { SpaceRole } from "@/features/chat/types/chat.enums";
import type { ChannelResponse } from "@/features/chat/types/chat.types";
import type { Task } from "@/features/project/types/project";
import { useAppSelector } from "@/store/store";

interface SelectTaskChannelDialogProps {
  task: Task | null;
  spaceId: string | null;
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (params: { channelId?: string }) => void;
}

export default function SelectTaskChannelDialog({
  task,
  spaceId,
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}: SelectTaskChannelDialogProps) {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const [channels, setChannels] = useState<ChannelResponse[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !spaceId) {
      setChannels([]);
      setSelectedChannelId("");
      return;
    }
    setLoadingChannels(true);
    getSpaceChannels(spaceId)
      .then((res) => {
        const rawChannels = res.data || [];
        // Filter channels joined by current user AND where member chat is permitted
        const allowedChannels = rawChannels.filter((c) => {
          // 1. Must be a member of the channel (or fallback if members unpopulated)
          if (c.members && c.members.length > 0) {
            const isMember = c.members.some((m) => m.userId === currentUserId);
            if (!isMember) return false;
          }

          // 2. Must not prohibit member messaging in channel settings
          const setting = (c as any).setting;
          if (setting && setting.allowSendMessage === false) {
            const userMember = c.members?.find((m) => m.userId === currentUserId);
            const isUserAdmin =
              userMember?.role === SpaceRole.ADMIN || c.createdBy === currentUserId;
            if (!isUserAdmin) return false;
          }

          // 3. Read only flag check
          if ((c as any).isReadOnly) return false;

          return true;
        });

        setChannels(allowedChannels);
        if (allowedChannels.length > 0) {
          const taskChannel = allowedChannels.find(
            (c) => c.name?.toLowerCase() === "task-discussions",
          );
          const defaultChannel = allowedChannels.find((c) => c.isDefault);
          setSelectedChannelId(
            (taskChannel ?? defaultChannel ?? allowedChannels[0]).id,
          );
        } else {
          setSelectedChannelId("");
        }
      })
      .catch(() => {
        setChannels([]);
        setSelectedChannelId("");
      })
      .finally(() => setLoadingChannels(false));
  }, [isOpen, spaceId, currentUserId]);

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ channelId: selectedChannelId || undefined });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-2xl border-slate-200 bg-white shadow-2xl">
        <DialogHeader className="text-left pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
            <MessageSquare size={16} />
            <span>Task Discussion Thread</span>
          </div>
          <DialogTitle className="text-base font-bold text-slate-900 mt-1">
            Choose Channel for Discussion Thread
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Select a Space Channel that you have joined. A dedicated Thread for Task <span className="font-semibold text-slate-700">"{task.title}"</span> will be created inside it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <UserCheck size={14} className="text-blue-600" />
              <span>Target Channel {spaceId ? `(${channels.length} available)` : ""}</span>
            </label>

            {!spaceId ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-800 font-medium flex flex-col gap-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle size={14} /> Project Space Required
                </span>
                <span>
                  This project does not have an associated Space yet. Please link or create a Space for this project first before starting task discussion threads.
                </span>
              </div>
            ) : loadingChannels ? (
              <div className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 flex items-center text-xs text-slate-400 font-medium">
                Loading your space channels...
              </div>
            ) : channels.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-800 font-medium flex flex-col gap-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle size={14} /> No Selectable Channels
                </span>
                <span>
                  No joined channels found in this Space where member chat is permitted. Contact your space admin for chat permissions.
                </span>
              </div>
            ) : (
              <Select
                value={selectedChannelId}
                onValueChange={(val) => setSelectedChannelId(val)}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 cursor-pointer shadow-xs transition-colors">
                  <SelectValue placeholder="Select a channel..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white shadow-xl z-[130]">
                  {channels.map((channel) => (
                    <SelectItem
                      key={channel.id}
                      value={channel.id}
                      className="cursor-pointer text-xs py-2.5 px-3 focus:bg-blue-50 focus:text-blue-700 font-medium rounded-lg"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Hash size={14} className="text-blue-600 shrink-0" />
                        <span className="truncate">{channel.name}</span>
                        {channel.isDefault && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full font-medium ml-1">
                            default
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!spaceId || isSubmitting || loadingChannels || channels.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              <Sparkles size={13} />
              <span>{isSubmitting ? "Opening..." : "Open Thread in Space"}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

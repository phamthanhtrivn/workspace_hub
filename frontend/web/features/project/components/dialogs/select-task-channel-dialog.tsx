"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Sparkles, UserCheck, Hash, Lock, AlertCircle } from "lucide-react";
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
import { ChannelVisibility, SpaceRole } from "@/features/chat/types/chat.enums";
import type { ChannelResponse } from "@/features/chat/types/chat.types";
import type { Task } from "@/features/project/types/project";
import { useAppSelector } from "@/store/store";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";


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
              c.visibility === ChannelVisibility.PRIVATE ? c.ownerId === currentUserId : userMember?.role === SpaceRole.ADMIN || c.createdBy === currentUserId;
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
      <DialogContent className="flex max-w-md flex-col p-0 rounded-dialog border-border bg-card">
        <DialogHeader className="shrink-0 break-words text-left px-4 pt-4 pb-2 pr-12 sm:px-6 sm:pr-12">
          <div className="flex items-center gap-2 text-xs font-semibold text-info-content">
            <MessageSquare size={16} />
            <span>Task Discussion Thread</span>
          </div>
          <DialogTitle className="text-base font-semibold text-foreground mt-1">
            Choose Channel for Discussion Thread
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Select a Space Channel that you have joined. A dedicated Thread for Task <span className="inline-block max-w-full truncate align-bottom font-semibold text-foreground" title={task.title}>"{task.title}"</span> will be created inside it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 max-h-[inherit] flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4 sm:px-6">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <UserCheck size={14} className="text-info-content" />
              <span>Target Channel {spaceId ? `(${channels.length} available)` : ""}</span>
            </label>

            {!spaceId ? (
              <div className="rounded-panel border border-border bg-warning-soft/80 p-3.5 text-xs text-warning-content font-medium flex flex-col gap-1">
                <span className="font-semibold flex items-center gap-1.5 text-warning-content">
                  <AlertCircle size={14} /> Project Space Required
                </span>
                <span>
                  This project does not have an associated Space yet. Please link or create a Space for this project first before starting task discussion threads.
                </span>
              </div>
            ) : loadingChannels ? (
              <LoadingState label="Loading your space channels..." className="h-11 w-full rounded-panel border border-border bg-background px-3.5 flex items-center text-xs text-muted-foreground font-medium" />
            ) : channels.length === 0 ? (
              <div className="rounded-panel border border-border bg-warning-soft/80 p-3.5 text-xs text-warning-content font-medium flex flex-col gap-1">
                <span className="font-semibold flex items-center gap-1.5 text-warning-content">
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
                <SelectTrigger className="h-11 w-full rounded-control border-input bg-background px-3.5 text-xs font-semibold text-foreground cursor-pointer transition-colors">
                  <SelectValue placeholder="Select a channel..." />
                </SelectTrigger>
                <SelectContent className="rounded-panel border-border bg-card">
                  {channels.map((channel) => (
                    <SelectItem
                      key={channel.id}
                      value={channel.id}
                      className="cursor-pointer text-xs py-2.5 px-3 focus:bg-info-soft focus:text-info-content font-medium rounded-lg"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {channel.visibility === ChannelVisibility.PRIVATE ? <Lock size={14} className="text-info-content shrink-0" aria-label="Private channel" /> : <Hash size={14} className="text-info-content shrink-0" />}
                        <span className="truncate">{channel.name}</span>
                        {channel.isDefault && (
                          <span className="text-xs bg-info-soft text-info-content px-1.5 py-0.2 rounded-full font-medium ml-1">
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

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-border sm:px-6">
            <Button variant="secondary"
              type="button"
              onClick={onClose}
              className="rounded-control px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </Button>
            <Button loading={isSubmitting} variant="default"
              type="submit"
              disabled={!spaceId || isSubmitting || loadingChannels || channels.length === 0}
              className="flex items-center gap-1.5 rounded-control px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles size={13} />
              <span>{isSubmitting ? "Opening..." : "Open Thread in Space"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

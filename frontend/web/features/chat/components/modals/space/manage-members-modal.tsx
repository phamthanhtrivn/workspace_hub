"use client";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import { IconButton } from "@/components/ui/icon-button";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState } from "react";

import {
  FiX,
  FiSearch,
  FiShield,
  FiShieldOff,
  FiLogOut,
  FiTrash2,
} from "react-icons/fi";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import ChatConfirmDialog from "@/features/chat/components/ui/chat-confirm-dialog";
import { useChatConfirmDialog } from "@/features/chat/hooks/useChatConfirmDialog";
import { FaKey } from "react-icons/fa";
import {
  ChannelResponse,
  ChatProfilesMap,
  ConversationMember,
  SpaceRole,
} from "@/features/chat/types/chat.types";
import { chatKeys } from "@/features/chat/types/chat.constant";
import {
  getSpaceDetails,
  transferSpaceOwnership,
} from "@/features/chat/api/space.api";
import {
  disbandChannel,
  kickMember,
  leaveChannel,
  updateMemberRole,
} from "@/features/chat/api/channel.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogSurface } from "@/components/ui/dialog";
import { canLeaveSpaceChannel } from "@/features/chat/utils/channel-membership-permissions";


function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
}

interface ManageMembersModalProps {
  channel: ChannelResponse;
  memberProfiles: ChatProfilesMap;
  currentUserId: string;
  onClose: () => void;
}

export default function ManageMembersModal({
  channel,
  memberProfiles,
  currentUserId,
  onClose,
}: ManageMembersModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { confirm: confirmAction, confirmDialogProps } = useChatConfirmDialog();

  const { data: spaceDetail } = useQuery({
    queryKey: chatKeys.spaceDetails(channel.spaceId),
    queryFn: async () => (await getSpaceDetails(channel.spaceId)).data,
    enabled: !!channel.spaceId,
  });

  const spaceCreatorId = spaceDetail?.createdBy;
  const isCurrentUserOwner = spaceCreatorId === currentUserId;

  const mounted = useHydrated();


  const currentUserMember = channel.members?.find(
    (member) => member.userId === currentUserId,
  );
  const currentUserRole = currentUserMember?.role;
  const isCurrentUserAdmin = currentUserRole === SpaceRole.ADMIN;
  const isProjectSpace = Boolean(channel.projectId || spaceDetail?.projectId);
  const canLeaveChannel = canLeaveSpaceChannel(
    channel,
    currentUserId,
    spaceDetail,
  );
  const canDisbandChannel = !channel.isDefault && isCurrentUserAdmin;
  const leaveLabel = channel.isDefault ? "Leave Space" : "Leave Channel";

  const handleUpdateRole = async (
    memberId: string,
    role: "ADMIN" | "MEMBER",
  ) => {
    if (isProcessing) return;

    const actionText =
      role === "ADMIN"
        ? "promote this user to Admin"
        : "demote this user to Member";
    const confirmed = await confirmAction({
      title: "Update Member Role",
      description: `Are you sure you want to ${actionText}?`,
      variant: "warning",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await updateMemberRole(channel.id, memberId, role);
      toast.success("Member role updated successfully");
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(channel.spaceId),
      });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to update member role",
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferOwnership = async (memberId: string) => {
    if (isProcessing) return;

    const memberName =
      memberProfiles?.[memberId]?.fullName || "this user";
    const confirmed = await confirmAction({
      title: "Transfer Space Ownership",
      description: `Are you sure you want to transfer ownership of this space to ${memberName}? You will no longer be the primary owner.`,
      variant: "warning",
      confirmLabel: "Transfer",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await transferSpaceOwnership(channel.spaceId, memberId);
      toast.success("Space ownership transferred successfully");
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(channel.spaceId),
      });
      queryClient.invalidateQueries({
        queryKey: chatKeys.spaceDetails(channel.spaceId),
      });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to transfer space ownership",
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (isProcessing || !spaceDetail || isProjectSpace) return;
    const confirmed = await confirmAction({
      title: "Remove Member",
      description: "Are you sure you want to remove this member from the channel?",
      variant: "warning",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;
    setIsProcessing(true);
    try {
      await kickMember(channel.id, memberId);
      toast.success("Member removed successfully");
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(channel.spaceId),
      });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to remove member",
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaveSpace = async () => {
    if (isProcessing || !canLeaveChannel) return;

    const confirmed = await confirmAction({
      title: `Confirm: ${leaveLabel}`,
      description: channel.isDefault
        ? "Leaving the default channel will remove you from this space. Are you sure?"
        : "Are you sure you want to leave this channel?",
      variant: "warning",
      confirmLabel: leaveLabel,
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;
    setIsProcessing(true);
    try {
      await leaveChannel(channel.id);
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(channel.spaceId),
      });
      if (channel.isDefault) {
        queryClient.invalidateQueries({ queryKey: chatKeys.allSpaces() });
      }
      onClose();
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to leave space",
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisbandChannel = async () => {
    if (isProcessing) return;
    const confirmed = await confirmAction({
      title: "Disband Channel",
      description: "Are you sure you want to disband this channel? This action cannot be undone.",
      variant: "danger",
      confirmLabel: "Disband",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;
    setIsProcessing(true);
    try {
      await disbandChannel(channel.id);
      toast.success("Channel disbanded successfully");
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(channel.spaceId),
      });
      onClose();
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to disband channel",
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMembers = channel.members?.filter((member) => {
    const profile = memberProfiles?.[member.userId];
    const name = profile?.fullName || "User";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!mounted) return null;

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/50 transition-all duration-200">
      <div className={`${dialogLayout.surface} bg-card rounded-dialog w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] border border-border`}>
        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
          <h2 className="text-section-title font-semibold text-foreground tracking-tight">
            Manage Members
          </h2>
          <Button variant="unstyled" aria-label="Close"
            onClick={onClose}
            className="p-2.5 text-muted-foreground hover:text-muted-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </Button>
        </div>

        <div className="p-4 border-b border-border bg-background">
          <div className="relative group">
            <FiSearch
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-info-content transition-colors"
            />
            <Input aria-label="Search members" unstyled
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-card border border-input rounded-control text-sm transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className={`${dialogLayout.body} flex-1 overflow-y-auto p-3 space-y-1`}>
          {filteredMembers?.map((member: ConversationMember) => {
            const profile = memberProfiles?.[member.userId];
            const name =
              profile?.fullName || "User";
            const isMe = member.userId === currentUserId;
            const displayName = isMe
              ? "You"
              : name;
            const isCreator = member.userId === spaceCreatorId;
            const canCurrentUserRemove =
              !!spaceDetail &&
              !isProjectSpace &&
              !isMe &&
              !isCreator &&
              (isCurrentUserOwner ||
                (isCurrentUserAdmin && member.role === SpaceRole.MEMBER));

            return (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2 hover:bg-background rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 shrink-0">
                    <div className="w-full h-full bg-accent rounded-full flex items-center justify-center text-muted-foreground overflow-hidden">
                      {profile?.avatarUrl ? (
                        <Image
                          src={profile.avatarUrl}
                          alt="Avatar"
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="font-semibold text-sm">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isCreator ? (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-warning border border-border text-warning-foreground"
                        title="Owner"
                      >
                        <FaKey size={8} />
                      </span>
                    ) : member.role === SpaceRole.ADMIN ? (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground"
                        title="Admin"
                      >
                        <FaKey size={8} />
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {displayName}
                      </span>
                      {isCreator ? (
                        <span className="text-xs bg-warning-soft text-warning-content px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 border border-border">
                          <FaKey size={10} className="text-warning-content" />{" "}
                          Owner
                        </span>
                      ) : member.role === SpaceRole.ADMIN ? (
                        <span className="text-xs bg-info-soft text-info-content px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 border border-border">
                          <FiShield size={10} className="text-info-content" />{" "}
                          Admin
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {profile?.email}
                    </span>
                  </div>
                </div>

                {!isMe && (
                  <div className="flex items-center gap-2">
                    {isCurrentUserOwner && (
                      <>
                        {member.role === SpaceRole.MEMBER && (
                          <IconButton label="Promote to Admin" showTooltip={false} size="icon-sm"
                            onClick={() =>
                              handleUpdateRole(member.userId, SpaceRole.ADMIN)
                            }
                            title="Promote to Admin"
                            className="p-2 text-muted-foreground hover:text-info-content hover:bg-info-soft rounded-control transition-colors cursor-pointer"
                          >
                            <FiShield size={18} />
                          </IconButton>
                        )}
                        {member.role === SpaceRole.ADMIN && !isCreator && (
                            <IconButton label="Demote to Member" showTooltip={false} size="icon-sm"
                              onClick={() =>
                                handleUpdateRole(member.userId, SpaceRole.MEMBER)
                              }
                              title="Demote to Member"
                              className="p-2 text-info-content hover:bg-info-soft rounded-control transition-colors cursor-pointer"
                            >
                              <FiShieldOff size={18} />
                            </IconButton>
                          )}
                        <IconButton label="Transfer Ownership" showTooltip={false} size="icon-sm"
                          onClick={() => handleTransferOwnership(member.userId)}
                          title="Transfer Ownership"
                          className="p-2 text-muted-foreground hover:text-warning-content hover:bg-warning-soft rounded-control transition-colors cursor-pointer"
                        >
                          <FaKey size={16} className="text-warning-content" />
                        </IconButton>
                      </>
                    )}

                    {canCurrentUserRemove && (
                      <IconButton label="Remove from Space" showTooltip={false} size="icon-sm"
                        onClick={() => handleKickMember(member.userId)}
                        title="Remove from Space"
                        className="p-2 text-muted-foreground hover:text-destructive-content hover:bg-destructive-soft rounded-control transition-colors cursor-pointer"
                      >
                        <FiTrash2 size={18} />
                      </IconButton>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(canLeaveChannel || canDisbandChannel) && (
          <div className="p-5 border-t border-border bg-background flex gap-3">
            {canLeaveChannel && (
              <Button variant="unstyled"
                onClick={handleLeaveSpace}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-destructive-content bg-card border border-border hover:bg-destructive-soft hover:border-destructive-outline rounded-control transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiLogOut size={18} />
                {leaveLabel}
              </Button>
            )}

            {canDisbandChannel && (
              <Button variant="destructive"
                onClick={handleDisbandChannel}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-control transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiTrash2 size={18} />
                Disband Channel
              </Button>
            )}
          </div>
        )}
      </div>
      <ChatConfirmDialog {...confirmDialogProps} />
    </div>}</DialogSurface>;
}


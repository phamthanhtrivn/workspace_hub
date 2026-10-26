"use client";
import { useId as useInputFieldId } from "react";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React from "react";
import { Send, Users, MessageSquare } from "lucide-react";
import { DocumentItem } from "../../types/documents.types";
import { ShareTabType } from "../../types/documents.enums";
import { useShareToChat } from "../../hooks/useShareToChat";
import { DocumentsConfirmDialog } from "../ui/documents-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { Textarea } from "@/components/ui/textarea";

interface ShareToChatModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  item: DocumentItem | null;
  projectId?: string;
}

export function ShareToChatModal({
  open,
  isOpen,
  onClose,
  item,
  projectId,
}: ShareToChatModalProps) {
  const inputFieldId = useInputFieldId();
  const isModalOpen = open ?? isOpen ?? false;

  const {
    activeTab,
    setActiveTab,
    selectedChatId,
    setSelectedChatId,
    selectedSpaceId,
    setSelectedSpaceId,
    introMessage,
    setIntroMessage,
    isSubmitting,
    spaces,
    channels,
    directConversations,
    handleShare,
    executeShare,
    isPermissionConfirmOpen,
    setIsPermissionConfirmOpen,
    pendingUnauthorizedEmails,
    currentUserId,
    isProjectDocuments,
    isLoadingProjectSpace,
    projectSpaceUnavailable,
  } = useShareToChat({
    item,
    projectId,
    onSuccess: onClose,
  });

  if (!isModalOpen || !item) return null;
  const selectedTab = isProjectDocuments ? ShareTabType.CHANNEL : activeTab;

  const spaceOptions =
    spaces?.map((space) => ({
      value: space.id,
      label: space.name,
    })) || [];

  const channelOptions = [
    {
      value: "",
      label: projectSpaceUnavailable
        ? "Project chat space unavailable"
        : channels.length > 0
          ? "Select channel..."
          : "No channels allow sending",
    },
    ...channels.map((ch) => ({
      value: ch.id,
      label: `# ${ch.name}`,
    })),
  ];

  const dmOptions = [
    { value: "", label: "Select conversation..." },
    ...directConversations.map((conv) => {
      const otherMember = conv.members?.find((m) => m.userId !== currentUserId);
      const name =
        otherMember?.profile?.fullName ||
        otherMember?.nickname ||
        "Direct Message";
      return { value: conv.id, label: name };
    }),
  ];

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}>
        <DialogContent
          className={`${dialogLayout.surface} max-w-md border-border bg-card p-6 text-foreground rounded-dialog`}
          showCloseButton={!isSubmitting}
        >
          <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-panel bg-info-soft text-info-content ring-1 ring-ring">
              <Send className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                Share to chat
              </DialogTitle>
              <p className="mt-0.5 truncate text-xs text-muted-foreground font-semibold">
                {item.name}
              </p>
            </div>
          </DialogHeader>

          {!isProjectDocuments ? (
            <div className="mt-3 flex items-center border-b border-border gap-6">
              <Button variant="unstyled"
                type="button"
                onClick={() => setActiveTab(ShareTabType.CHANNEL)}
                className={`flex items-center gap-2 pb-3 pt-2 text-sm font-semibold border-b-2 transition cursor-pointer ${
                  activeTab === ShareTabType.CHANNEL
                    ? "border-info-outline text-info-content"
                    : "border-transparent text-muted-foreground hover:text-muted-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Channels</span>
              </Button>
              <Button variant="unstyled"
                type="button"
                onClick={() => setActiveTab(ShareTabType.DM)}
                className={`flex items-center gap-2 pb-3 pt-2 text-sm font-semibold border-b-2 transition cursor-pointer ${
                  activeTab === ShareTabType.DM
                    ? "border-info-outline text-info-content"
                    : "border-transparent text-muted-foreground hover:text-muted-foreground"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Direct messages</span>
              </Button>
            </div>
          ) : null}

          <div className={`${dialogLayout.body} mt-4 space-y-4`}>
            {selectedTab === ShareTabType.CHANNEL ? (
              <>
                {!isProjectDocuments ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Space
                    </label>
                    <CustomSelect
                      value={selectedSpaceId}
                      options={spaceOptions}
                      onChange={setSelectedSpaceId}
                      ariaLabel="Select Space"
                      triggerClassName="h-10 rounded-panel border border-input bg-background text-sm font-semibold text-foreground hover:bg-muted"
                    />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Channel
                  </label>
                  <CustomSelect
                    value={selectedChatId}
                    options={channelOptions}
                    onChange={setSelectedChatId}
                    ariaLabel="Select Channel"
                    triggerClassName="h-10 rounded-panel border border-input bg-background text-sm font-semibold text-foreground hover:bg-muted"
                  />
                </div>
                {projectSpaceUnavailable ? (
                  <p className="text-xs font-semibold text-warning-content">
                    Project chat space is not available.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recipient
                </label>
                <CustomSelect
                  value={selectedChatId}
                  options={dmOptions}
                  onChange={setSelectedChatId}
                  ariaLabel="Select Recipient"
                  triggerClassName="h-10 rounded-panel border border-input bg-background text-sm font-semibold text-foreground hover:bg-muted"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor={`${inputFieldId}-field-206`} className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Message (optional)
              </label>
              <Textarea id={`${inputFieldId}-field-206`} aria-label="Message (optional)"
                value={introMessage}
                onChange={(e) => setIntroMessage(e.target.value)}
                placeholder="Add a message..."
                className="min-h-[80px] rounded-control border border-input bg-background p-3 text-sm font-semibold text-foreground focus:outline-hidden focus:border-info-outline"
              />
            </div>
          </div>

          <DialogFooter className="mt-5 flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={onClose}
              className="h-10 rounded-control border border-border bg-card px-5 text-sm font-semibold text-muted-foreground hover:bg-background hover:text-foreground"
            >
              Cancel
            </Button>
            <Button loading={isSubmitting || isLoadingProjectSpace}
              type="button"
              disabled={
                isSubmitting ||
                isLoadingProjectSpace ||
                projectSpaceUnavailable ||
                !selectedChatId
              }
              onClick={handleShare}
              className="h-10 rounded-control bg-primary hover:bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isSubmitting || isLoadingProjectSpace ? "Sharing..." : "Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Grant Confirm Dialog */}
      <DocumentsConfirmDialog
        open={!isProjectDocuments && isPermissionConfirmOpen}
        title="Permissions required"
        description={`Some members (${pendingUnauthorizedEmails.length}) do not have view access to this file. Grant view permission to them?`}
        confirmLabel="Grant access and share"
        cancelLabel="Share only"
        variant="warning"
        isLoading={isSubmitting}
        onConfirm={() => executeShare(true)}
        onCancel={() => executeShare(false)}
      />
    </>
  );
}

export default ShareToChatModal;

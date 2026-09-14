"use client";

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
}

export function ShareToChatModal({
  open,
  isOpen,
  onClose,
  item,
}: ShareToChatModalProps) {
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
  } = useShareToChat({
    item,
    onSuccess: onClose,
  });

  if (!isModalOpen || !item) return null;

  const spaceOptions =
    spaces?.map((space) => ({
      value: space.id,
      label: space.name,
    })) || [];

  const channelOptions = [
    { value: "", label: "Select channel..." },
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
          className="max-w-md border-slate-100 bg-white p-6 text-slate-800 shadow-2xl rounded-3xl"
          showCloseButton={!isSubmitting}
        >
          <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
              <Send className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-black text-slate-800">
                Share to chat
              </DialogTitle>
              <p className="mt-0.5 truncate text-xs text-slate-400 font-bold">
                {item.name}
              </p>
            </div>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="mt-3 flex items-center border-b border-slate-100 gap-6">
            <button
              type="button"
              onClick={() => setActiveTab(ShareTabType.CHANNEL)}
              className={`flex items-center gap-2 pb-3 pt-2 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === ShareTabType.CHANNEL
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Channels</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(ShareTabType.DM)}
              className={`flex items-center gap-2 pb-3 pt-2 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === ShareTabType.DM
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Direct messages</span>
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {activeTab === ShareTabType.CHANNEL ? (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                    Space
                  </label>
                  <CustomSelect
                    value={selectedSpaceId}
                    options={spaceOptions}
                    onChange={setSelectedSpaceId}
                    ariaLabel="Select Space"
                    className="h-10 rounded-xl border border-slate-100 bg-slate-50 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                    Channel
                  </label>
                  <CustomSelect
                    value={selectedChatId}
                    options={channelOptions}
                    onChange={setSelectedChatId}
                    ariaLabel="Select Channel"
                    className="h-10 rounded-xl border border-slate-100 bg-slate-50 text-sm font-semibold text-slate-700"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                  Recipient
                </label>
                <CustomSelect
                  value={selectedChatId}
                  options={dmOptions}
                  onChange={setSelectedChatId}
                  ariaLabel="Select Recipient"
                  className="h-10 rounded-xl border border-slate-100 bg-slate-50 text-sm font-semibold text-slate-700"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                Message (optional)
              </label>
              <Textarea
                value={introMessage}
                onChange={(e) => setIntroMessage(e.target.value)}
                placeholder="Add a message..."
                className="min-h-[80px] rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-sm font-semibold text-slate-700 focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          <DialogFooter className="mt-5 flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={onClose}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || !selectedChatId}
              onClick={handleShare}
              className="h-10 rounded-2xl bg-purple-600 hover:bg-purple-700 px-5 text-sm font-bold text-white shadow-md shadow-purple-500/10 disabled:opacity-50"
            >
              {isSubmitting ? "Sharing..." : "Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Grant Confirm Dialog */}
      <DocumentsConfirmDialog
        open={isPermissionConfirmOpen}
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

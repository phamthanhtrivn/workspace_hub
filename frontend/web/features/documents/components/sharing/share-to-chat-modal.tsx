"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, MessageSquare, Users, Loader2 } from "lucide-react";
import { DocumentItem } from "../../types/documents.types";
import { ShareTabType } from "../../types/documents.enums";
import { useShareToChat } from "../../hooks/useShareToChat";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface ShareToChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DocumentItem | null;
}

export default function ShareToChatModal({
  isOpen,
  onClose,
  item,
}: ShareToChatModalProps) {
  const intl = useAppIntl();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
    currentUserId,
  } = useShareToChat({
    item,
    onSuccess: onClose,
  });

  if (!isOpen || !item || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-50 p-6 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
              <Send size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 leading-tight">
                {intl.formatMessage({ id: "documents.shareToChat" })}
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5 truncate max-w-[280px]">
                {item.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors border border-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab(ShareTabType.CHANNEL)}
            className={`flex items-center gap-2 pb-3 pt-2 text-sm font-bold border-b-2 transition-all cursor-pointer mr-6 ${
              activeTab === ShareTabType.CHANNEL
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Users size={16} />
            <span>{intl.formatMessage({ id: "chat.channels" })}</span>
          </button>
          <button
            onClick={() => setActiveTab(ShareTabType.DM)}
            className={`flex items-center gap-2 pb-3 pt-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === ShareTabType.DM
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <MessageSquare size={16} />
            <span>{intl.formatMessage({ id: "chat.directMessages" })}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-white space-y-4">
          {activeTab === ShareTabType.CHANNEL ? (
            <>
              {/* Space Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  {intl.formatMessage({ id: "chat.space" })}
                </label>
                <select
                  value={selectedSpaceId}
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 p-3 text-sm font-semibold bg-slate-50 focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  {spaces?.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  {intl.formatMessage({ id: "chat.channel" })}
                </label>
                <select
                  value={selectedChatId}
                  onChange={(e) => setSelectedChatId(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 p-3 text-sm font-semibold bg-slate-50 focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="">
                    {intl.formatMessage({ id: "documents.chooseChannel" })}
                  </option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      # {channel.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            /* DM Selection */
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {intl.formatMessage({ id: "documents.recipient" })}
              </label>
              <select
                value={selectedChatId}
                onChange={(e) => setSelectedChatId(e.target.value)}
                className="w-full rounded-xl border border-slate-100 p-3 text-sm font-semibold bg-slate-50 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="">
                  {intl.formatMessage({ id: "documents.chooseConversation" })}
                </option>
                {directConversations.map((conv) => {
                  const otherMember = conv.members?.find(
                    (m) => m.userId !== currentUserId,
                  );
                  const displayName =
                    otherMember?.profile?.fullName ||
                    otherMember?.nickname ||
                    intl.formatMessage({ id: "chat.directConversation" });
                  return (
                    <option key={conv.id} value={conv.id}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Intro message */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
              {intl.formatMessage({ id: "documents.introMessageOptional" })}
            </label>
            <textarea
              value={introMessage}
              onChange={(e) => setIntroMessage(e.target.value)}
              placeholder={intl.formatMessage({
                id: "documents.shareMessagePlaceholder",
              })}
              className="w-full rounded-2xl border border-slate-100 p-3 text-sm font-semibold focus:outline-none focus:border-violet-500 bg-slate-50/50 min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-50 p-6 bg-slate-50/50 shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            onClick={handleShare}
            disabled={isSubmitting || !selectedChatId}
            className="flex items-center gap-2 cursor-pointer rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{intl.formatMessage({ id: "documents.sharing" })}</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>{intl.formatMessage({ id: "documents.share" })}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

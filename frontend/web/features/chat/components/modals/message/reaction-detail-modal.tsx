"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogSurface } from "@/components/ui/dialog";


interface ReactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactions: {
    emoji: string;
    userId: string;
    user?: { name: string; avatarUrl: string };
  }[];
}

const ReactionDetailModal: React.FC<ReactionDetailModalProps> = ({
  isOpen,
  onClose,
  reactions,
}) => {
  const [activeTab, setActiveTab] = useState<string>("all");

  if (!isOpen) return null;

  // Group reactions by emoji
  const groupedReactions = reactions.reduce(
    (acc, curr) => {
      if (!acc[curr.emoji]) acc[curr.emoji] = [];
      acc[curr.emoji].push(curr);
      return acc;
    },
    {} as Record<string, typeof reactions>,
  );

  const emojis = Object.keys(groupedReactions);
  const displayReactions =
    activeTab === "all" ? reactions : groupedReactions[activeTab] || [];

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
      <div className={`${dialogLayout.surface} bg-card rounded-panel w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200`}>
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-section-title font-semibold text-foreground">
            Reactions
          </h2>
          <Button variant="unstyled" aria-label="Close"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground cursor-pointer"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
          <Button variant="unstyled"
            onClick={() => setActiveTab("all")}
            className={`cursor-pointer px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "all" ? "text-info-content border-b-2 border-info-outline" : "text-muted-foreground hover:text-foreground hover:bg-background"}`}
          >
            {`All (${reactions.length})`}
          </Button>
          {emojis.map((emoji) => (
            <Button variant="unstyled"
              key={emoji}
              onClick={() => setActiveTab(emoji)}
              className={`cursor-pointer px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${activeTab === emoji ? "text-info-content border-b-2 border-info-outline" : "text-muted-foreground hover:text-foreground hover:bg-background"}`}
            >
              <span>{emoji}</span>
              <span>{groupedReactions[emoji].length}</span>
            </Button>
          ))}
        </div>

        <div className={`${dialogLayout.body} p-2 max-h-[300px] overflow-y-auto`}>
          {displayReactions.map((reaction, idx) => (
            <Button variant="unstyled" type="button"
              key={idx}
              onClick={() => {
                onClose();
              }}
              className="w-full text-left flex items-center justify-between p-3 rounded-panel hover:bg-background transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-accent overflow-hidden">
                    {reaction.user?.avatarUrl ? (
                      <img
                        src={reaction.user.avatarUrl}
                        alt={reaction.user?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-info-soft text-info-content font-semibold">
                        {(reaction.user?.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 text-xs z-10 flex items-center justify-center min-w-[20px] min-h-[20px] shadow-panel">
                    {reaction.emoji}
                  </div>
                </div>
                <span className="font-medium text-foreground group-hover:text-info-content transition-colors">
                  {reaction.user?.name || "User"}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>}</DialogSurface>;
};

export default ReactionDetailModal;


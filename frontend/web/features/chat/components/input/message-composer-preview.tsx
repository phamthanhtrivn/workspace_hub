"use client";

import { useMemo, type ReactNode, type RefObject } from "react";
import { Eye } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import type { ChatProfilesMap } from "../../types/chat.types";
import { renderMessageContent } from "../../utils/message-formatter";
import { composeMessageText } from "../../utils/message-draft";

interface MessageComposerPreviewProps {
  id: string;
  message: string;
  interimMessage?: string;
  memberProfiles?: ChatProfilesMap;
  mentionNames?: string[];
  compact?: boolean;
  open: boolean;
  children: ReactNode;
  className?: string;
}

export default function MessageComposerPreview({
  id,
  message,
  interimMessage,
  memberProfiles,
  mentionNames,
  compact,
  open,
  children,
  className,
}: MessageComposerPreviewProps) {
  const content = composeMessageText(message, interimMessage);
  const rendered = useMemo(
    () => (open ? renderMessageContent(content, memberProfiles, mentionNames) : null),
    [open, content, memberProfiles, mentionNames],
  );
  return (
    <div className={cn("w-full min-w-0", className)}>
      <div
        hidden={open}
        className="min-w-0 [&_textarea]:block [&_textarea]:w-full"
      >
        {children}
      </div>
      {open && (
        <section id={id} aria-label="Message preview" className="min-w-0">
          <h3 className="sr-only">Message preview</h3>
          <div
            tabIndex={0}
            className={cn(
              "max-h-[min(15rem,30dvh)] min-h-9 min-w-0 overflow-y-auto overscroll-contain px-2 py-2 font-medium text-foreground [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [@media(max-height:30rem)]:max-h-12",
              compact ? "min-h-6 py-1 pl-1 text-xs" : "text-sm",
            )}
          >
            {content ? (
              rendered
            ) : (
              <p className="font-normal text-muted-foreground">
                Type a message to preview its formatting.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export function MessageComposerPreviewButton({
  message, interimMessage, open, onOpenChange, previewId, textareaRef,
}: {
  message: string;
  interimMessage?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewId: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const togglePreview = () => {
    onOpenChange(!open);
    if (open) requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight + textarea.offsetHeight - textarea.clientHeight}px`;
      textarea.focus({ preventScroll: true });
    });
  };

  return (
    <IconButton
      label={open ? "Edit message" : "Preview message"}
      title={open ? "Edit message" : "Preview message"}
      showTooltip={false}
      size="icon-sm"
      variant={open ? "info-soft" : "ghost"}
      aria-pressed={open}
      aria-controls={open ? previewId : undefined}
      aria-expanded={open}
      disabled={!composeMessageText(message, interimMessage)}
      onClick={togglePreview}
      className="shrink-0 self-center text-muted-foreground aria-pressed:text-info-content"
    >
      <Eye size={16} aria-hidden="true" />
    </IconButton>
  );
}

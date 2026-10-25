"use client";

import { useId, useMemo, useRef, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import type { ChatProfilesMap } from "../../types/chat.types";
import { renderMessageContent } from "../../utils/message-formatter";
import { composeMessageText } from "../../utils/message-draft";

interface MessageComposerPreviewProps {
  message: string;
  interimMessage?: string;
  memberProfiles?: ChatProfilesMap;
  compact?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export default function MessageComposerPreview({
  message,
  interimMessage,
  memberProfiles,
  compact,
  open,
  onOpenChange,
  children,
  className,
}: MessageComposerPreviewProps) {
  const regionId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const content = composeMessageText(message, interimMessage);
  const rendered = useMemo(
    () => (open ? renderMessageContent(content, memberProfiles) : null),
    [open, content, memberProfiles],
  );
  const togglePreview = () => {
    onOpenChange(!open);
    if (open)
      requestAnimationFrame(() => {
        const textarea = wrapperRef.current?.querySelector("textarea");
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight + textarea.offsetHeight - textarea.clientHeight}px`;
        textarea.focus({ preventScroll: true });
      });
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full min-w-0", className)}>
      <IconButton
        label={open ? "Edit message" : "Preview message"}
        title={open ? "Edit message" : "Preview message"}
        showTooltip={false}
        size="icon-sm"
        variant={open ? "info-soft" : "ghost"}
        aria-pressed={open}
        aria-controls={regionId}
        aria-expanded={open}
        disabled={!content}
        onClick={togglePreview}
        className="absolute right-0 top-0 z-10 text-muted-foreground aria-pressed:text-info-content"
      >
        <Eye size={16} aria-hidden="true" />
      </IconButton>
      <div
        hidden={open}
        className="min-w-0 [&_textarea]:w-full [&_textarea]:pr-12"
      >
        {children}
      </div>
      {open && (
        <section id={regionId} aria-label="Message preview" className="min-w-0">
          <h3 className="sr-only">Message preview</h3>
          <div
            tabIndex={0}
            className={cn(
              "max-h-[min(15rem,30dvh)] min-h-9 min-w-0 overflow-y-auto overscroll-contain px-2 py-2 pr-12 font-medium text-foreground [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [@media(max-height:30rem)]:max-h-12",
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

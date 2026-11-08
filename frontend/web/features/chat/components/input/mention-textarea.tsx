"use client";

import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getMentionNames,
  splitMentionText,
} from "../../utils/mention-presentation";
import type { ChatProfilesMap } from "../../types/chat.types";

type MentionTextareaProps = ComponentProps<typeof Textarea> & {
  mentionProfiles?: ChatProfilesMap;
  mentionNames?: string[];
};

/** Retain native text editing/IME, with an inert, size-matched mention highlight layer. */
export const MentionTextarea = forwardRef<
  HTMLTextAreaElement,
  MentionTextareaProps
>(function MentionTextarea(
  { mentionProfiles, mentionNames = [], className, value, onScroll, ...props },
  forwardedRef,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const text = typeof value === "string" ? value : "";
  const parts = splitMentionText(text, [
    ...getMentionNames(mentionProfiles),
    ...mentionNames,
  ]);
  const highlighted = parts.some((part) => part.mention);
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const layer = highlightRef.current;
    if (!textarea || !layer) return;
    const sync = () => {
      layer.style.width = `${textarea.clientWidth}px`;
      layer.style.height = `${textarea.clientHeight}px`;
      layer.scrollTop = textarea.scrollTop;
      layer.scrollLeft = textarea.scrollLeft;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [text, highlighted]);
  return (
    <div className="relative min-w-0 w-full">
      {highlighted && (
        <div
          ref={highlightRef}
          aria-hidden="true"
          className={cn(
            className,
            "pointer-events-none absolute left-0 top-0 whitespace-pre-wrap break-words overflow-hidden text-foreground",
          )}
        >
          {parts.map((part, index) =>
            part.mention ? (
              <span
                key={index}
                className="rounded bg-info-soft text-info-content [box-decoration-break:clone]"
              >
                {part.source ?? part.text}
              </span>
            ) : (
              part.text
            ),
          )}
          {text.endsWith("\n") ? "\u200b" : null}
        </div>
      )}
      <Textarea
        {...props}
        value={value}
        className={cn(
          className,
          "relative",
          highlighted &&
            "!text-transparent caret-foreground selection:bg-info-soft selection:text-foreground",
        )}
        ref={(element) => {
          textareaRef.current = element;
          if (typeof forwardedRef === "function") forwardedRef(element);
          else if (forwardedRef) forwardedRef.current = element;
        }}
        onScroll={(event) => {
          if (highlightRef.current) {
            highlightRef.current.scrollTop = event.currentTarget.scrollTop;
            highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }
          onScroll?.(event);
        }}
      />
    </div>
  );
});

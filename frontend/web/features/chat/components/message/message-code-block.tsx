"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";
import { CHAT_CODE_COPY_FEEDBACK_MS } from "../../types/chat.constant";

export default function MessageCodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [feedback, setFeedback] = useState<{
    code: string;
    status: "copied" | "error";
  } | null>(null);
  const [copying, setCopying] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);
  const status = feedback?.code === code ? feedback.status : null;
  const copied = status === "copied";
  const handleCopy = async () => {
    setCopying(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    try {
      await copyTextToClipboard(code);
      if (!mounted.current) return;
      setFeedback({ code, status: "copied" });
      resetTimer.current = setTimeout(
        () => setFeedback(null),
        CHAT_CODE_COPY_FEEDBACK_MS,
      );
    } catch {
      if (mounted.current) setFeedback({ code, status: "error" });
    } finally {
      if (mounted.current) setCopying(false);
    }
  };

  return (
    <div className="my-1.5 w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-input bg-primary text-primary-foreground">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-primary-foreground/20 px-3 py-1.5 whitespace-normal">
        <span className="min-w-0 truncate text-xs font-medium">
          {language || "Code"}
        </span>
        <Button
          type="button"
          variant="unstyled"
          disabled={copying}
          aria-label={copied ? "Code copied" : "Copy code"}
          onClick={(event) => {
            event.stopPropagation();
            void handleCopy();
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground disabled:opacity-60"
        >
          {copied ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Copy size={14} aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        <span
          role="status"
          aria-live="polite"
          className={status === "error" ? "basis-full text-xs" : "sr-only"}
        >
          {copied
            ? "Code copied to clipboard."
            : status === "error"
              ? "Could not copy code. Try again."
              : ""}
        </span>
      </div>
      <pre
        tabIndex={0}
        aria-label={language ? `${language} code` : "Code block"}
        className="m-0 max-w-full overflow-x-auto p-3 font-mono text-[11px] leading-normal whitespace-pre select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

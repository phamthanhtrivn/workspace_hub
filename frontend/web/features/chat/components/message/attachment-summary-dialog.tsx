"use client";

import ReactMarkdown from "react-markdown";
import { RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AttachmentSummaryDialog({
  fileName,
  content,
  busy,
  onClose,
  onRegenerate,
}: {
  fileName: string;
  content: string;
  busy: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-w-2xl flex-col p-0">
        <DialogHeader className="shrink-0 pr-14">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles aria-hidden className="size-4 text-info-content" />
            Document summary
          </DialogTitle>
          <DialogDescription className="break-words">
            {fileName}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto break-words px-5 pb-5 text-sm leading-relaxed [&_p+p]:mt-3 [&_li]:ml-5 [&_ul]:list-disc [&_ol]:list-decimal">
          <ReactMarkdown
            skipHtml
            urlTransform={() => ""}
            components={{
              a: ({ children }) => <span>{children}</span>,
              img: () => null,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        <DialogFooter className="shrink-0 flex-wrap">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button loading={busy} disabled={busy} onClick={onRegenerate}>
            <RotateCcw aria-hidden className="size-4" />
            Generate again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

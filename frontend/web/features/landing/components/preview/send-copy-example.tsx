import { Check, Hash, Search, Send, X } from "lucide-react";
import {
  DOCUMENT_COPY_TABS,
  DOCUMENT_COPY_MESSAGES,
} from "@/features/documents/types/document-copy.constants";
import { PREVIEW_TEAM } from "./preview-data";
import { PreviewAction, PreviewAvatar } from "./preview-ui";
import { DocumentIcon } from "@/features/documents/components/common/document-icon";
import { DocumentItemType } from "@/features/documents/types/documents.enums";

export function SendCopyExample() {
  const recipients = PREVIEW_TEAM.filter((member) => member.name !== "Tri");

  return (
    <div
      aria-label="Sample Send a copy to existing DMs"
      className="mt-5 space-y-3 rounded-panel border border-border bg-background p-4"
    >
      <p className="text-sm font-semibold">Send a copy</p>
      <div className="flex min-w-0 items-center gap-2 text-xs">
        <DocumentIcon
          item={{
            type: DocumentItemType.FILE,
            name: "Research brief.pdf",
            mimeType: "application/pdf",
          }}
          iconSize={18}
          className="size-8 rounded-full"
        />
        <span className="truncate">Research brief.pdf</span>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-control bg-muted p-1">
        {DOCUMENT_COPY_TABS.map((tab) => (
          <span
            key={tab.value}
            className={`flex items-center justify-center gap-1.5 rounded-control px-3 py-2 text-center text-xs font-semibold ${tab.value === "direct" ? "bg-card text-foreground" : "text-muted-foreground"}`}
          >
            <tab.icon aria-hidden="true" className="size-4 shrink-0" />
            {tab.label}
          </span>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {DOCUMENT_COPY_MESSAGES.dmHelp}
      </p>
      <div className="flex flex-wrap gap-2 rounded-panel border border-border bg-card p-2">
        {recipients.map((recipient) => (
          <span
            key={recipient.name}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-info-soft px-1.5 py-1 text-xs font-medium text-info-content"
          >
            <PreviewAvatar name={recipient.name} />
            {recipient.name}
            <X aria-hidden="true" className="size-3.5" />
          </span>
        ))}
      </div>
      <p className="flex items-center gap-2 rounded-control border border-input bg-card px-3 py-2 text-xs text-muted-foreground">
        <Search aria-hidden="true" className="size-4" />
        Search name, email or nickname...
      </p>
      <div className="divide-y divide-border rounded-panel border border-border bg-card">
        {recipients.map((recipient) => (
          <div
            key={recipient.name}
            className="flex items-center gap-3 p-3 text-sm"
          >
            <PreviewAvatar name={recipient.name} className="size-8" />
            <span className="flex-1 font-medium">{recipient.name}</span>
            <Check aria-hidden="true" className="size-4 text-info-content" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          {recipients.length} selected
        </span>
        <PreviewAction variant="default">
          <Send aria-hidden="true" />
          Send copies ({recipients.length})
        </PreviewAction>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Hash aria-hidden="true" className="size-4 shrink-0" />
        Channels: choose one Space and one Channel.
      </p>
    </div>
  );
}

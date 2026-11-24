import { ChevronRight, Folder, Grid2X2, HardDrive, List, Lock, MoreHorizontal, Plus, Star } from "lucide-react";
import { DOCUMENT_NAVIGATION_ITEMS } from "@/features/documents/types/document-navigation.constants";
import { DocumentIcon } from "@/features/documents/components/common/document-icon";
import { DocumentItemType, DocumentRole, DocumentViewType, LinkAccess } from "@/features/documents/types/documents.enums";
import { LINK_ACCESS_LABELS, PERMISSION_ROLE_LABELS } from "@/features/documents/types/documents.constants";
import { DocumentPreviewExample } from "./document-preview-example";
import { DocumentVersionsExample } from "./document-versions-example";
import { SendCopyExample } from "./send-copy-example";
import { DocumentsCard } from "@/features/documents/components/ui/documents-card";
import { PREVIEW_DOCUMENTS } from "./preview-data";
import { PreviewShell } from "./preview-shell";
import { PreviewAction, PreviewBadge, PreviewHeading, PreviewNavigation, PreviewSearch, PreviewSelect } from "./preview-ui";

const DOCUMENT_NAVIGATION = DOCUMENT_NAVIGATION_ITEMS.map(item => ({ ...item, active: item.id === DocumentViewType.MY_FILES }));

export function DocumentsPreview() {
  return <PreviewShell moduleId="documents">
    <div className="flex min-h-0 min-w-0 flex-1 flex-col @min-[960px]/preview-module:flex-row">
      <aside className="shrink-0 border-b border-border bg-sidebar p-4 @min-[960px]/preview-module:flex @min-[960px]/preview-module:w-80 @min-[960px]/preview-module:flex-col @min-[960px]/preview-module:border-b-0 @min-[960px]/preview-module:border-r @min-[960px]/preview-module:py-6">
        <div className="overflow-x-auto"><PreviewNavigation items={DOCUMENT_NAVIGATION} className="@min-[960px]/preview-module:flex-col" /></div>
        <div className="mt-auto hidden border-t border-border pt-5 @min-[960px]/preview-module:block"><p className="flex items-center gap-2 text-sm font-semibold"><HardDrive aria-hidden="true" className="size-4" />Storage</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/4 bg-info-content" /></div><p className="mt-2 text-xs text-muted-foreground">Sample storage · 1.2 GB of 5 GB</p></div>
      </aside>
      <div role="region" aria-label="Sample document explorer" tabIndex={0} className="@container/preview-documents min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring @min-[800px]/preview-module:p-6">
        <div className="min-w-0 rounded-lg border border-border bg-card p-4 @min-[640px]/preview-documents:p-5">
          <PreviewHeading title="My files" subtitle="Organize and manage your files and folders." />
          <div className="my-5 flex flex-wrap items-center justify-between gap-3 border-b border-input pb-5"><PreviewSearch placeholder="Search documents and folders..." className="w-full @min-[750px]/preview-documents:max-w-sm" /><div className="flex flex-wrap items-center gap-3"><PreviewSelect>Latest</PreviewSelect><span className="inline-flex gap-1 rounded-md border border-border bg-muted p-1"><Grid2X2 aria-hidden="true" className="size-7 rounded-md border border-border bg-card p-1.5 text-info-content" /><List aria-hidden="true" className="size-7 p-1.5 text-muted-foreground" /></span><PreviewAction variant="default" className="h-10 text-sm"><Plus aria-hidden="true" />New</PreviewAction></div></div>
          <div className="mb-5 flex items-center gap-2 text-sm font-medium"><Folder aria-hidden="true" className="size-4 text-warning-content" />My files<ChevronRight aria-hidden="true" className="size-3 text-muted-foreground" /></div>
          <div className="grid grid-cols-1 gap-4 @min-[440px]/preview-documents:grid-cols-2 @min-[800px]/preview-documents:grid-cols-3">{PREVIEW_DOCUMENTS.map(document => {
            return <DocumentsCard key={document.id} interactive={false} className="flex min-w-0 flex-col"><div className="flex items-start justify-between gap-2"><DocumentIcon item={{ type: document.kind === "folder" ? DocumentItemType.FOLDER : DocumentItemType.FILE, name: document.name, mimeType: null }} iconSize={22} className="rounded-panel p-3" /><MoreHorizontal aria-hidden="true" className="mt-2 size-4 text-muted-foreground" /></div><p className="mt-3 truncate text-sm font-semibold" title={document.name}>{document.name}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{document.kind === "folder" ? "Folder" : document.detail}</p><div className="mt-4 flex items-center justify-between pt-2"><PreviewBadge tone={document.kind === "folder" ? "warning" : "muted"}>{document.kind === "folder" ? "Folder" : "File"}</PreviewBadge>{document.id === "research" && <Star aria-hidden="true" className="size-3.5 fill-warning-content text-warning-content" />}</div></DocumentsCard>;
          })}</div>
          <p className="mt-5 text-xs text-muted-foreground">{PREVIEW_DOCUMENTS.length} items</p>
          <DocumentPreviewExample />
          <div aria-label="Sample restricted file access" className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold">Shared by email</span>
            <PreviewBadge><Lock aria-hidden="true" className="size-3" />{LINK_ACCESS_LABELS[LinkAccess.NONE]}</PreviewBadge>
            <PreviewBadge tone="info">{PERMISSION_ROLE_LABELS[DocumentRole.VIEWER]}</PreviewBadge>
          </div>
          <DocumentVersionsExample />
          <SendCopyExample />
        </div>
      </div>
    </div>
  </PreviewShell>;
}

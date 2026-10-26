import { Bold, ChevronDown, FileText, FolderKanban, Globe, Hash, Info, Italic, Link2, MessageSquareText, Mic, Paperclip, Plus, Send, Smile, Video } from "lucide-react";
import { PREVIEW_PROJECT } from "../../landing-content";
import { PREVIEW_CHAT_CHANNELS, PREVIEW_CHAT_MESSAGES, PREVIEW_TEAM } from "./preview-data";
import { PreviewShell } from "./preview-shell";
import { PreviewAvatar, PreviewBadge, PreviewIcon, PreviewSearch } from "./preview-ui";

export function MessagesPreview() {
  return <PreviewShell moduleId="messages">
    <div className="flex min-h-0 min-w-0 flex-1">
      <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-sidebar @min-[720px]/preview-module:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-5"><FolderKanban aria-hidden="true" className="size-4 text-info-content" /><span className="min-w-0 flex-1 truncate font-semibold">{PREVIEW_PROJECT}</span><ChevronDown aria-hidden="true" className="size-4" /></div>
        <div className="p-3"><PreviewSearch placeholder="Search conversations..." className="border-transparent bg-muted" /></div>
        <div className="px-3"><div className="mb-5 flex items-center gap-2 rounded-control px-3 py-2 text-[13px] font-semibold"><MessageSquareText aria-hidden="true" className="size-4" />Threads</div>
          <p className="mb-2 flex justify-between px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Channels<Plus aria-hidden="true" className="size-3.5" /></p>
          {PREVIEW_CHAT_CHANNELS.map(channel => <div key={channel} className={`my-0.5 flex items-center gap-2.5 rounded-control px-3 py-2 text-[13px] ${channel === "research" ? "bg-primary-soft font-semibold text-primary-soft-foreground" : "text-muted-foreground"}`}>{channel === "general" ? <Globe aria-hidden="true" className="size-4" /> : <Hash aria-hidden="true" className="size-4" />}{channel}</div>)}
          <p className="mb-2 mt-7 flex justify-between px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Direct messages<Plus aria-hidden="true" className="size-3.5" /></p>
          {PREVIEW_TEAM.filter(member => member.name !== "Tri").map(member => <div key={member.name} className="flex items-center gap-2.5 px-3 py-2 text-[13px]"><PreviewAvatar name={member.name} /><span>{member.name}</span><span className="ml-auto size-1.5 rounded-full bg-success" /></div>)}
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2"><div className="flex items-center gap-2"><Hash aria-hidden="true" className="size-5 text-muted-foreground" /><p className="font-semibold">research</p><PreviewBadge>3 members</PreviewBadge></div><div className="flex gap-1"><PreviewIcon icon={Video} label="Start instant meeting" /><PreviewIcon icon={Info} label="Channel info" /></div></div>
        <div role="region" aria-label="Sample research conversation" tabIndex={0} className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring @min-[640px]/preview-module:p-6">
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>Monday, October 26</span><span className="h-px flex-1 bg-border" /></div>
          {PREVIEW_CHAT_MESSAGES.map(message => <div key={message.id} className="flex gap-3"><PreviewAvatar name={message.sender} className="size-9 rounded-control" /><div className="min-w-0 max-w-xl flex-1"><p className="mb-1 text-[13px] font-semibold tracking-tight">{message.sender}<span className="ml-2 text-xs font-medium text-muted-foreground">{message.time}</span></p><p className="rounded-panel rounded-tl-none border border-border bg-card p-3 text-sm font-medium leading-relaxed">{message.text}</p>
            {"attachment" in message && <div className="mt-3 flex max-w-sm items-center gap-3 rounded-panel border border-border bg-card p-3"><span className="rounded-control bg-destructive-soft p-2 text-destructive-content"><FileText aria-hidden="true" className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{message.attachment}</p><p className="mt-1 text-xs text-muted-foreground">PDF · 2.4 MB</p></div></div>}
            {"task" in message && <div className="mt-3 max-w-sm rounded-panel border border-border bg-card p-3"><p className="text-xs font-semibold text-muted-foreground">PROJECT TASK · GRAD-10</p><p className="mt-2 text-sm font-semibold">{message.task}</p><div className="mt-3 flex items-center gap-2"><PreviewBadge tone="info">In progress</PreviewBadge><PreviewAvatar name="Tri" /><span className="text-xs text-muted-foreground">Tri</span></div></div>}
          </div></div>)}
        </div>
        <div className="shrink-0 border-t border-border p-3 @min-[640px]/preview-module:p-4"><div className="rounded-panel border border-input bg-card"><div className="flex gap-1 border-b border-border px-2 py-1 text-muted-foreground">{[Bold, Italic, Link2].map((Icon, index) => <Icon key={index} aria-hidden="true" className="m-2 size-3.5" />)}</div><p className="px-4 py-4 text-sm text-muted-foreground">Message #research</p><div className="flex items-center justify-between px-3 pb-3"><span className="flex gap-3 text-muted-foreground"><Paperclip aria-hidden="true" className="size-4" /><Smile aria-hidden="true" className="size-4" /><Mic aria-hidden="true" className="size-4" /></span><span className="rounded-full bg-accent p-2 text-muted-foreground"><Send aria-hidden="true" className="size-4" /></span></div></div></div>
      </div>
    </div>
  </PreviewShell>;
}

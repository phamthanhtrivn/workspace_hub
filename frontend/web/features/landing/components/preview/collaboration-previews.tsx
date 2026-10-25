import { FileText, Folder, Hash, Paperclip, Video } from "lucide-react";
import { PREVIEW_MEMBERS, PREVIEW_TASK } from "../../landing-content";
import { PreviewAvatar, PreviewHeading, PreviewShell } from "./preview-shell";

export function MessagesPreview() {
  return <PreviewShell moduleId="messages">
    <div className="flex h-full min-w-0 gap-5">
      <div className="hidden w-28 shrink-0 border-r border-border pr-4 text-xs text-muted-foreground md:block"><p className="mb-4 font-medium text-foreground">Channels</p><p className="mb-3 flex items-center gap-1 text-link"><Hash aria-hidden="true" className="size-3" />research</p><p className="flex items-center gap-1"><Hash aria-hidden="true" className="size-3" />general</p></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <PreviewHeading title="# research" subtitle="The discussion behind the next step." />
        <div className="space-y-4 text-xs leading-5">
          <div className="flex gap-3"><PreviewAvatar name="Linh" /><div><p className="mb-1 font-semibold">Linh <span className="ml-2 font-normal text-muted-foreground">09:15</span></p><p>I added the interview notes. Let&apos;s use them to shape the prototype.</p><div className="mt-2 flex items-center gap-2 text-link"><Paperclip aria-hidden="true" className="size-3" />Interview notes.pdf</div></div></div>
          <div className="flex gap-3"><PreviewAvatar name="Tri" /><div className="min-w-0"><p className="mb-1 font-semibold">Tri <span className="ml-2 font-normal text-muted-foreground">09:18</span></p><p>I&apos;ll take the prototype task and attach the research.</p><div className="mt-2 rounded-control border border-border px-3 py-2"><p className="text-[10px] text-muted-foreground">PROJECT TASK</p><p className="mt-1 font-medium">{PREVIEW_TASK}</p><p className="mt-1 text-link">In progress · Tri</p></div></div></div>
        </div>
        <div className="mt-auto hidden border-t border-border pt-3 text-xs text-muted-foreground sm:block">Project conversations, with the context attached.</div>
      </div>
    </div>
  </PreviewShell>;
}

export function MeetingsPreview() {
  return <PreviewShell moduleId="meetings">
    <PreviewHeading title="Meetings" subtitle="A little face time. A shared way forward." />
    <div className="grid gap-5 sm:grid-cols-[1.2fr_1fr]">
      <div className="rounded-panel bg-primary-soft p-5 text-primary-soft-foreground sm:p-6">
        <Video aria-hidden="true" className="mb-6 size-6" /><p className="text-xs">Upcoming · Wednesday</p><p className="mt-2 text-xl font-semibold tracking-tight">Prototype review</p><p className="mt-2 text-sm">14:00 – 14:30</p>
        <div className="mt-6 flex items-center gap-2">{PREVIEW_MEMBERS.map((name) => <PreviewAvatar key={name} name={name} className="bg-background text-foreground" />)}<span className="ml-1 text-xs">Project team</span></div>
      </div>
      <div className="hidden py-2 text-xs sm:block"><p className="font-medium">On the agenda</p><ol className="mt-4 space-y-4 text-muted-foreground"><li>Review the research findings</li><li>Walk through the prototype</li><li>Discuss the next iteration</li></ol><div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-link"><FileText aria-hidden="true" className="size-4" />Research brief.pdf</div></div>
    </div>
  </PreviewShell>;
}

const DOCUMENTS = [
  { name: "Research brief.pdf", type: "PDF document", owner: "Linh" },
  { name: "Interview notes.pdf", type: "PDF document", owner: "Linh" },
  { name: "Prototype walkthrough.pdf", type: "PDF document", owner: "Tri" },
] as const;

export function DocumentsPreview() {
  return <PreviewShell moduleId="documents">
    <PreviewHeading title="Project documents" subtitle="From the first reference to the final draft." />
    <div className="mb-5 flex items-center gap-3 rounded-control bg-muted px-4 py-3"><Folder aria-hidden="true" className="size-5 text-link" /><div><p className="text-xs font-medium">Research & references</p><p className="mt-0.5 text-[11px] text-muted-foreground">Shared project folder</p></div></div>
    <div className="flex justify-between border-b border-border pb-2 text-[10px] text-muted-foreground"><span>Name</span><span className="hidden sm:block">Shared by</span></div>
    {DOCUMENTS.map((document) => <div key={document.name} className="flex items-center gap-3 border-b border-border py-4"><FileText aria-hidden="true" className="size-5 shrink-0 text-link" /><div className="min-w-0"><p className="truncate text-xs font-medium">{document.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{document.type}</p></div><span className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><PreviewAvatar name={document.owner} />{document.owner}</span></div>)}
  </PreviewShell>;
}

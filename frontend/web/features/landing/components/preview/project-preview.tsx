import { Check, FileText, Flag, MessageSquare } from "lucide-react";
import { PREVIEW_TASK } from "../../landing-content";
import { PreviewAvatar, PreviewHeading, PreviewShell } from "./preview-shell";

const BOARD_COLUMNS = [
  { title: "To do", tasks: [{ title: "Prepare usability questions", label: "Research", owner: "Minh", document: false, done: false }, { title: "Write the evaluation plan", label: "Writing", owner: "Tri", document: true, done: false }] },
  { title: "In progress", tasks: [{ title: PREVIEW_TASK, label: "Development", owner: "Tri", document: true, done: false }, { title: "Review interview findings", label: "Research", owner: "Linh", document: true, done: false }] },
  { title: "Done", tasks: [{ title: "Define the project scope", label: "Planning", owner: "Linh", document: true, done: true }, { title: "Gather reference materials", label: "Research", owner: "Minh", document: false, done: true }] },
] as const;

export function ProjectPreview() {
  return <PreviewShell moduleId="projects">
    <PreviewHeading title="A clear path to hand-in." subtitle="Shared tasks. Clear responsibilities."><span className="hidden rounded-control bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary-soft-foreground sm:block">Board view</span></PreviewHeading>
    <div className="mb-4 flex gap-5 border-b border-border text-xs text-muted-foreground"><span className="border-b-2 border-primary-outline pb-2 font-medium text-link">Board</span><span>List</span><span>Calendar</span><span className="hidden sm:block">Summary</span></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BOARD_COLUMNS.map((column, index) => <div key={column.title} className={index === 2 ? "hidden min-w-0 sm:block" : "min-w-0"}>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium"><span className={index === 2 ? "size-1.5 rounded-full bg-success" : index === 1 ? "size-1.5 rounded-full bg-primary-outline" : "size-1.5 rounded-full bg-muted-foreground"} />{column.title}<span className="ml-auto text-muted-foreground">{column.tasks.length}</span></div>
        <div className="space-y-3">{column.tasks.map((task, taskIndex) => <div key={task.title} className={`rounded-control border border-border bg-card p-3 ${taskIndex > 0 ? "hidden sm:block" : ""}`}>
          <span className="text-[10px] font-medium text-link">{task.label}</span>
          <p className="mt-2 min-h-10 text-xs font-medium leading-5">{task.title}</p>
          <div className="mt-3 flex items-center gap-2 text-muted-foreground">{task.done ? <Check aria-hidden="true" className="size-3 text-success-content" /> : <Flag aria-hidden="true" className="size-3" />}{task.document && <FileText aria-hidden="true" className="size-3" />}<MessageSquare aria-hidden="true" className="size-3" /><PreviewAvatar name={task.owner} className="ml-auto" /></div>
        </div>)}</div>
      </div>)}
    </div>
  </PreviewShell>;
}

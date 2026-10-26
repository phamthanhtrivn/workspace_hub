import { Calendar, CalendarClock, CheckSquare2, ChevronDown, ChevronRight, ChevronUp, Equal, FileText, FolderKanban, LayoutDashboard, LayoutGrid, ListTodo, MessageCircle, MessageSquare, Plus, Route, Search, Settings, Timer, Users } from "lucide-react";
import { TaskPriority, TaskStatus } from "@/features/project/types/project";
import { PREVIEW_PROJECT } from "../../landing-content";
import { PREVIEW_BOARD_COLUMNS, PREVIEW_TEAM, type PreviewProjectTask } from "./preview-data";
import { PreviewShell } from "./preview-shell";
import { PreviewAction, PreviewAvatar, PreviewBadge, PreviewHeading, PreviewNavigation, PreviewSearch, PreviewSelect, PREVIEW_TONES } from "./preview-ui";

const PROJECT_NAVIGATION = [
  { label: "Overview", icon: LayoutDashboard }, { label: "Kanban Board", icon: LayoutGrid, active: true },
  { label: "Backlog", icon: ListTodo }, { label: "Schedule", icon: CalendarClock },
  { label: "Gantt chart", icon: Route }, { label: "Documents", icon: FileText },
] as const;

function ProjectTaskPreview({ task }: { task: PreviewProjectTask }) {
  const PriorityIcon = task.priority === TaskPriority.HIGH ? ChevronUp : task.priority === TaskPriority.LOW ? ChevronDown : Equal;
  return <div className="shrink-0 rounded-panel border border-border bg-card p-2.5">
    <p className="break-words text-[13px] font-semibold leading-snug">{task.title}</p>
    <PreviewBadge tone="info" className="mt-2">{task.label}</PreviewBadge>
    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
      <PreviewBadge><Calendar aria-hidden="true" className="size-3" />{task.due}</PreviewBadge>
      <PreviewBadge tone={task.checklist[0] === task.checklist[1] ? "success" : "muted"}><CheckSquare2 aria-hidden="true" className="size-3" />{task.checklist[0]}/{task.checklist[1]}</PreviewBadge>
      <span className="inline-flex items-center gap-1"><MessageSquare aria-hidden="true" className="size-3" />{task.comments}</span>
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs">
      <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground"><CheckSquare2 aria-hidden="true" className="size-3.5 text-info-content" />{task.key}</span>
      <span className="flex items-center gap-1.5 text-muted-foreground"><Timer aria-hidden="true" className="size-3.5" /><MessageCircle aria-hidden="true" className="size-3.5" /><PriorityIcon aria-label={`${task.priority.toLowerCase()} priority`} className={task.priority === TaskPriority.HIGH ? "size-4 text-warning-content" : "size-4"} /><PreviewAvatar name={task.owner} /></span>
    </div>
  </div>;
}

export function ProjectPreview() {
  return <PreviewShell moduleId="projects">
    <div className="flex min-h-0 min-w-0 flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar p-4 @min-[1000px]/preview-module:flex">
        <div className="mb-5 flex items-center gap-3 border-b border-border pb-5"><span className="grid size-10 shrink-0 place-items-center rounded-control bg-info-soft text-info-content"><FolderKanban aria-hidden="true" className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{PREVIEW_PROJECT}</p><p className="mt-1 text-xs text-muted-foreground">GRAD · Team project</p></div></div>
        <PreviewNavigation items={PROJECT_NAVIGATION} className="flex-col" />
        <div className="mt-5 border-t border-border pt-4"><p className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">Team members<Plus aria-hidden="true" className="size-3.5" /></p>{PREVIEW_TEAM.map(member => <div key={member.name} className="flex items-center gap-2.5 py-2"><PreviewAvatar name={member.name} className="size-8" /><div><p className="text-sm font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.role}</p></div></div>)}</div>
        <div className="mt-auto flex items-center gap-3 border-t border-border px-3 pt-4 text-sm font-semibold text-muted-foreground"><Settings aria-hidden="true" className="size-4" />Project settings</div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 @min-[800px]/preview-module:p-6">
        <div className="mb-2 flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground"><span>Projects</span><ChevronRight aria-hidden="true" className="size-3 shrink-0" /><span className="truncate">{PREVIEW_PROJECT}</span><ChevronRight aria-hidden="true" className="size-3 shrink-0" /><span className="shrink-0 text-foreground">Kanban Board</span></div>
        <PreviewHeading title="Kanban Board"><div className="flex flex-wrap gap-2"><PreviewAction><MessageCircle aria-hidden="true" />Project Chat</PreviewAction><PreviewAction variant="default"><Plus aria-hidden="true" />Create Task</PreviewAction></div></PreviewHeading>
        <div className="mt-4 flex flex-wrap gap-2">{PREVIEW_BOARD_COLUMNS.map(column => <PreviewBadge key={column.status} tone={column.tone}>{column.label}<span className="ml-1">{column.tasks.length}</span></PreviewBadge>)}</div>
        <div className="my-4 flex flex-wrap items-center gap-2 border-b border-border pb-4"><PreviewSearch placeholder="Search tasks..." className="w-full @min-[900px]/preview-module:w-48" /><PreviewSelect>All statuses</PreviewSelect><PreviewSelect>All priorities</PreviewSelect><PreviewAction><Users aria-hidden="true" />Assignee options</PreviewAction><Search aria-hidden="true" className="ml-auto hidden size-4 text-muted-foreground @min-[1000px]/preview-module:block" /></div>
        <div role="region" aria-label="Sample Kanban board" tabIndex={0} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain rounded-control outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <div className="grid min-h-full min-w-[1048px] grid-cols-5 gap-3 pb-2">{PREVIEW_BOARD_COLUMNS.map(column => <div key={column.status} className="flex min-w-0 flex-col rounded-panel bg-muted p-2.5">
            <div className="mb-3 flex items-center gap-2"><h5 className="text-xs font-semibold tracking-wider">{column.label}</h5><span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${PREVIEW_TONES[column.tone]}`}>{column.tasks.length}</span>{column.status === TaskStatus.TODO && <Plus aria-hidden="true" className="ml-auto size-4 text-muted-foreground" />}</div>
            <div className="space-y-2">{column.tasks.map(task => <ProjectTaskPreview key={task.key} task={task} />)}</div>
            {column.tasks.length === 0 && <div className="mt-1 flex min-h-40 flex-1 items-center justify-center rounded-panel border border-dashed border-input bg-background text-xs font-medium text-muted-foreground">No tasks</div>}
          </div>)}</div>
        </div>
      </div>
    </div>
  </PreviewShell>;
}

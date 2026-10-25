import { ArrowRight, Check, FileText, MessageSquare, Timer } from "lucide-react";
import { PREVIEW_FOCUS_MINUTES, PREVIEW_PROJECT, PREVIEW_TASK } from "../landing-content";

export function LandingWorkflow() {
  return (
    <section id="workflow" aria-labelledby="workflow-heading" className="scroll-mt-8 border-y border-border bg-muted/35">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="mb-12 grid gap-5 md:grid-cols-2 md:items-end">
          <h2 id="workflow-heading" className="max-w-md text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Less switching.<br />More moving forward.</h2>
          <p className="max-w-md text-sm leading-7 text-muted-foreground md:justify-self-end">The tools you need are useful on their own. The connections between them help you take the next step.</p>
        </div>
        <ol className="divide-y divide-border">
          <li className="grid gap-6 py-8 md:grid-cols-[2.5rem_1fr_1fr] md:gap-8 md:py-10">
            <span className="text-sm font-medium tabular-nums text-link" aria-hidden="true">01</span>
            <div><h3 className="text-xl font-semibold tracking-tight">Start with a shared plan.</h3><p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">Break your project into tasks. Give each one an owner, a deadline, and the documents needed to get started.</p></div>
            <div className="flex flex-col justify-center border-t border-border pt-5 md:border-t-0 md:pt-0"><p className="text-xs text-muted-foreground">{PREVIEW_PROJECT}</p><p className="mt-2 flex items-start gap-2 text-sm font-medium"><span className="mt-1 size-3.5 shrink-0 rounded-sm border border-input" />{PREVIEW_TASK}</p><div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground"><span className="rounded-md bg-primary-soft px-2 py-1 text-primary-soft-foreground">In progress</span><span>Assigned to Tri</span></div></div>
          </li>
          <li className="grid gap-6 py-8 md:grid-cols-[2.5rem_1fr_1fr] md:gap-8 md:py-10">
            <span className="text-sm font-medium tabular-nums text-link" aria-hidden="true">02</span>
            <div><h3 className="text-xl font-semibold tracking-tight">Bring the context along.</h3><p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">Discuss the work in a project channel, share your research, and meet when it helps to talk things through.</p></div>
            <div className="flex flex-col justify-center border-t border-border pt-5 md:border-t-0 md:pt-0"><div className="flex items-start gap-3"><MessageSquare aria-hidden="true" className="mt-1 size-4 shrink-0 text-link" /><p className="text-sm leading-6"><span className="font-medium">Linh</span><br /><span className="text-muted-foreground">The research brief is attached to the task.</span></p></div><p className="mt-3 flex items-center gap-2 pl-7 text-xs text-link"><FileText aria-hidden="true" className="size-3.5" />Research brief.pdf</p></div>
          </li>
          <li className="grid gap-6 py-8 md:grid-cols-[2.5rem_1fr_1fr] md:gap-8 md:py-10">
            <span className="text-sm font-medium tabular-nums text-link" aria-hidden="true">03</span>
            <div><h3 className="text-xl font-semibold tracking-tight">Find your next moment of focus.</h3><p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">Check your tasks alongside your calendar. Choose a project or personal task in Pomodoro and give it your attention.</p></div>
            <div className="flex flex-col justify-center border-t border-border pt-5 md:border-t-0 md:pt-0"><div className="flex items-center gap-3 text-xs text-muted-foreground"><span>Project task</span><ArrowRight aria-hidden="true" className="size-3.5" /><span>Focus session</span></div><p className="mt-3 flex items-center gap-2 text-xl font-semibold tracking-tight"><Timer aria-hidden="true" className="size-5 text-link" />{PREVIEW_FOCUS_MINUTES} minutes, one next step.</p><p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Check aria-hidden="true" className="size-3.5 text-success-content" />Keep a history of your focus sessions</p></div>
          </li>
        </ol>
      </div>
    </section>
  );
}

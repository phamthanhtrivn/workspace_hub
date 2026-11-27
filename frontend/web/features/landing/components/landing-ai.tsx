import { Sparkles } from "lucide-react";
import { LANDING_AI_FEATURES } from "../landing-content";
import { FadeIn } from "./motion/fade-in";

export function LandingAi() {
  return (
    <section
      id="ai"
      aria-labelledby="ai-heading"
      className="scroll-mt-8 bg-brand-navy py-20 text-brand-ice sm:py-24"
    >
      <FadeIn className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-ice/80">
            Meet your AI co-pilot
          </p>
          <h2
            id="ai-heading"
            className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight text-brand-ice sm:text-4xl"
          >
            Less searching.
            <br />
            More doing.
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-brand-ice/80">
            WorkspaceHub brings useful AI assistance closer to your work. Ask
            about task priorities, explore notebook sources, or revisit team
            conversations without losing context.
          </p>
          <ul className="mt-7 space-y-3">
            {LANDING_AI_FEATURES.map(({ title, icon: Icon }) => (
              <li
                key={title}
                className="flex items-center gap-3 text-sm font-medium text-brand-ice"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-control bg-brand-blue text-brand-ice">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span>{title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-panel border border-brand-ice/20 bg-brand-blue/70 p-5 shadow-dialog">
          <div className="flex items-center justify-between border-b border-brand-ice/15 pb-4 text-xs font-bold text-brand-ice">
            <span className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="size-4" />
              WorkspaceHub AI Assistant
            </span>
            <span className="rounded-full bg-brand-navy/60 px-2.5 py-0.5 text-[11px] font-medium text-brand-ice/80">
              Illustrative demo
            </span>
          </div>

          <div className="ml-auto mt-5 max-w-[85%] rounded-panel rounded-br-sm bg-brand-navy/70 px-4 py-3 text-xs leading-6 text-brand-ice">
            What should I focus on today?
          </div>

          <div className="mt-4 rounded-panel bg-card p-5 text-xs leading-6 text-card-foreground">
            <p className="font-bold text-foreground">
              Here&apos;s a practical plan for today.
            </p>
            <p className="mt-1 text-muted-foreground">
              Based on your sample project tasks:
            </p>
            <ol className="mt-3 space-y-1.5 font-medium text-foreground">
              <li>1. Finish the prototype design — high priority</li>
              <li>2. Review API integration — in progress</li>
              <li>3. Prepare the sprint summary — next step</li>
            </ol>
            <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
              Illustrative answer only · Verify actual task data in the app.
            </p>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

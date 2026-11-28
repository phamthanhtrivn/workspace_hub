import type { ComponentType } from "react";
import { LANDING_MODULES, type LandingModuleId } from "../landing-content";
import { ProductPreviewTabs } from "./product-preview-tabs";
import { DashboardPreview } from "./preview/dashboard-preview";
import { ProjectPreview } from "./preview/project-preview";
import { DocumentsPreview } from "./preview/documents-preview";
import { MeetingsPreview } from "./preview/meetings-preview";
import { MessagesPreview } from "./preview/messages-preview";
import { CalendarPreview } from "./preview/calendar-preview";
import { PomodoroPreview } from "./preview/pomodoro-preview";
import { NotebookPreview } from "./preview/notebook-preview";
import { FadeIn } from "./motion/fade-in";

const PREVIEW_COMPONENTS = {
  dashboard: DashboardPreview,
  projects: ProjectPreview,
  calendar: CalendarPreview,
  pomodoro: PomodoroPreview,
  messages: MessagesPreview,
  meetings: MeetingsPreview,
  documents: DocumentsPreview,
  ai: NotebookPreview,
} satisfies Record<LandingModuleId, ComponentType>;

export function ProductPreview() {
  return (
    <section
      id="product"
      aria-labelledby="product-heading"
      className="scroll-mt-8 border-y border-border bg-muted/35 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
        <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-link">
            Explore the workspace
          </p>
          <h2
            id="product-heading"
            className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl"
          >
            One workspace. Every part of your day.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Explore all eight workspace modules. Select a tab to inspect its
            interface.
          </p>
        </FadeIn>

        <ProductPreviewTabs
          panels={LANDING_MODULES.map(({ icon: Icon, ...module }) => {
            const Preview = PREVIEW_COMPONENTS[module.id];

            return {
              ...module,
              icon: <Icon aria-hidden="true" className="size-5" />,
              content: <Preview />,
            };
          })}
        />
      </div>
    </section>
  );
}

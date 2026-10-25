import type { ComponentType } from "react";
import { LANDING_MODULES, type LandingModuleId } from "../landing-content";
import { ProductPreviewTabs } from "./product-preview-tabs";
import { ProjectPreview } from "./preview/project-preview";
import { DocumentsPreview, MeetingsPreview, MessagesPreview } from "./preview/collaboration-previews";
import { CalendarPreview, PomodoroPreview } from "./preview/planning-previews";

const PREVIEW_COMPONENTS = {
  projects: ProjectPreview, messages: MessagesPreview, meetings: MeetingsPreview,
  documents: DocumentsPreview, calendar: CalendarPreview, pomodoro: PomodoroPreview,
} satisfies Record<LandingModuleId, ComponentType>;

export function ProductPreview() {
  return <section id="product" aria-labelledby="product-heading" className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-20 sm:px-8 sm:pb-28">
    <h2 id="product-heading" className="sr-only">Explore your connected workspace</h2>
    <ProductPreviewTabs panels={LANDING_MODULES.map(({ icon: Icon, ...module }) => {
      const Preview = PREVIEW_COMPONENTS[module.id];
      return { ...module, icon: <Icon aria-hidden="true" className="size-4" />, content: <Preview /> };
    })} />
  </section>;
}

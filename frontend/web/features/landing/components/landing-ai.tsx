import { LANDING_AI_FEATURES } from "../landing-content";
import { FadeIn } from "./motion/fade-in";

export function LandingAi() {
  return (
    <section
      id="ai"
      aria-labelledby="ai-heading"
      className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-20 sm:px-8 sm:pb-24"
    >
      <FadeIn className="grid gap-6 border-t border-border pt-16 md:grid-cols-[0.8fr_1.2fr] md:gap-16 sm:pt-20">
        <div>
          <h2
            id="ai-heading"
            className="max-w-sm text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            AI, with the context to help.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
            From a research question to the next task on your calendar. Find
            assistance where the work already happens.
          </p>
          <p className="mt-6 max-w-sm text-xs leading-6 text-muted-foreground">
            Availability depends on your settings, access and configured AI
            services. Review answers against their sources, original work or
            recordings.
          </p>
        </div>
        <div className="divide-y divide-border">
          {LANDING_AI_FEATURES.map(
            ({ title, location, icon: Icon, description, example }) => (
              <article key={title} className="py-6 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-link"
                  />
                  <div>
                    <h3 className="text-base font-semibold">{title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {location}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {description}
                </p>
                <p className="mt-3 text-xs leading-6">
                  <span className="text-muted-foreground">For example: </span>
                  {example}
                </p>
              </article>
            ),
          )}
        </div>
      </FadeIn>
    </section>
  );
}

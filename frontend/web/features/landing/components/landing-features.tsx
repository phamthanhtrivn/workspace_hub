import { LANDING_FEATURE_CARDS } from "../landing-content";
import { FadeIn, FadeInStagger } from "./motion/fade-in";

export function LandingFeatures() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="mx-auto max-w-6xl scroll-mt-8 px-5 py-20 sm:px-8 sm:py-24"
    >
      <FadeIn className="mx-auto mb-12 max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-link">
          Everything in one place
        </p>
        <h2
          id="features-heading"
          className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl"
        >
          All the tools you need.
          <br />
          None of the clutter.
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Move seamlessly from planning to collaboration to execution. Your work
          stays connected, wherever you are.
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FadeInStagger>
          {LANDING_FEATURE_CARDS.map(({ title, description, icon: Icon }) => (
            <FadeIn key={title}>
              <article className="group flex h-full flex-col rounded-panel border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:border-info-outline/60 hover:shadow-panel">
                <span className="grid size-10 place-items-center rounded-control bg-primary-soft text-primary-soft-foreground transition-transform duration-200 group-hover:scale-105">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 text-base font-bold text-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </article>
            </FadeIn>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}

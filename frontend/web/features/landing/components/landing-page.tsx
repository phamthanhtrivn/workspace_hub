import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANDING_LINKS } from "../landing-content";
import { LandingHeader, LandingLogo } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingFeatures } from "./landing-features";
import { LandingAi } from "./landing-ai";
import { LandingFaq } from "./landing-faq";
import { ProductPreview } from "./product-preview";
import { SlideIn } from "./motion/slide-in";
import { LandingMotionProvider } from "./motion/landing-motion-provider";
import { LANDING_MOTION_STYLE } from "./motion/motion-config";
import "../landing-motion.css";

export function LandingPage() {
  return (
    <LandingMotionProvider>
      <div
        style={LANDING_MOTION_STYLE}
        className="landing-page overflow-x-clip bg-background text-foreground selection:bg-primary selection:text-primary-foreground"
      >
        <Link
          href="#main-content"
          className="sr-only z-50 rounded-control bg-background p-3 text-sm text-foreground focus:fixed focus:left-4 focus:top-4 focus:not-sr-only focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </Link>
        <div className="bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--primary-soft)_72%,transparent),transparent_72%)]">
          <LandingHeader />
          <main id="main-content" tabIndex={-1} className="outline-none">
            <LandingHero />
            <LandingFeatures />
            <ProductPreview />
            <LandingAi />
            <LandingFaq />
            <section
              aria-labelledby="get-started-heading"
              className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-20"
            >
              <SlideIn
                from="bottom"
                preset="cta"
                className="flex flex-col items-start justify-between gap-8 rounded-panel bg-primary px-7 py-10 text-primary-foreground sm:px-12 sm:py-14 md:flex-row md:items-center"
              >
                <div>
                  <h2
                    id="get-started-heading"
                    className="text-balance text-3xl font-bold tracking-tight sm:text-4xl"
                  >
                    Ready to do your best work?
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-primary-foreground/85">
                    Bring your ideas, people and plans together in WorkspaceHub.
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="landing-action h-12 shrink-0 gap-2.5 bg-background px-6 font-semibold text-foreground hover:bg-background/90"
                >
                  <Link href="/register">
                    Get Started
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
              </SlideIn>
            </section>
          </main>
        </div>
        <footer className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
            <div>
              <LandingLogo />
              <p className="mt-3 text-xs text-muted-foreground">
                One place for ideas to become progress.
              </p>
            </div>
            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-muted-foreground"
            >
              {[...LANDING_LINKS, { label: "Sign in", href: "/login" }].map(
                (link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-sm py-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
        </footer>
      </div>
    </LandingMotionProvider>
  );
}

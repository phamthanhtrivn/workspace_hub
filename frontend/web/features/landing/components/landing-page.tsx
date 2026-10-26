import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANDING_LINKS } from "../landing-content";
import { LandingHeader, LandingLogo } from "./landing-header";
import { LandingWorkflow } from "./landing-workflow";
import { LandingFaq } from "./landing-faq";
import { ProductPreview } from "./product-preview";
import { SlideIn } from "./motion/slide-in";
import { LandingHeroMotion } from "./motion/landing-hero-motion";
import { LandingMotionProvider } from "./motion/landing-motion-provider";
import { LANDING_MOTION_STYLE } from "./motion/motion-config";
import "../landing-motion.css";

export function LandingPage() {
  return (
    <LandingMotionProvider>
    <div style={LANDING_MOTION_STYLE} className="landing-page overflow-x-clip bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <Link href="#main-content" className="sr-only z-50 rounded-control bg-background p-3 text-sm text-foreground focus:fixed focus:left-4 focus:top-4 focus:not-sr-only focus:ring-2 focus:ring-ring">Skip to content</Link>
      <div className="bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--primary-soft)_72%,transparent),transparent_72%)]">
        <LandingHeader />
        <main id="main-content" tabIndex={-1} className="outline-none">
          <section aria-labelledby="hero-heading" className="mx-auto max-w-6xl px-5 pb-10 pt-10 text-center sm:px-8 sm:pb-12 sm:pt-12 lg:pt-14">
            <LandingHeroMotion
              heading={<h1 id="hero-heading" className="text-balance text-[clamp(3.25rem,6.5vw,5rem)] font-semibold leading-[1.06] tracking-[-0.04em]">Your work, <span className="text-link">connected.</span></h1>}
              description={<p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:mt-7 sm:text-lg sm:leading-8">Projects, conversations, meetings, documents, and your calendar. Brought together, with space to focus.</p>}
              actions={<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-9 sm:flex-row sm:gap-4">
                <Button asChild size="lg" className="landing-action h-12 w-full gap-3 px-6 text-sm sm:w-auto"><Link href="/register">Get Started<ArrowRight aria-hidden="true" /></Link></Button>
                <Button asChild variant="ghost" size="lg" className="landing-action landing-action-down h-12 w-full gap-3 px-5 text-sm sm:w-auto"><Link href="#product">Explore the Workspace<ArrowDown aria-hidden="true" /></Link></Button>
              </div>}
            />
            <p className="mt-6 text-xs leading-5 text-muted-foreground">For your own plans. And the ones you share.</p>
          </section>
          <ProductPreview />
          <LandingWorkflow />
          <LandingFaq />
          <section aria-labelledby="get-started-heading" className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-20">
            <SlideIn from="bottom" preset="cta" className="flex flex-col items-start justify-between gap-8 rounded-panel bg-primary px-7 py-10 text-primary-foreground sm:px-12 sm:py-14 md:flex-row md:items-center">
              <div><h2 id="get-started-heading" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Make room for your next idea.</h2><p className="mt-4 max-w-lg text-sm leading-7">Bring the plan, the people, and the work together.<br className="hidden sm:block" /> Start your WorkspaceHub.</p></div>
              <Button asChild size="lg" variant="secondary" className="landing-action h-12 shrink-0 gap-3 bg-background px-6 text-foreground hover:bg-background/90"><Link href="/register">Create Your Account<ArrowRight aria-hidden="true" /></Link></Button>
            </SlideIn>
          </section>
        </main>
      </div>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div><LandingLogo /><p className="mt-3 text-xs text-muted-foreground">A little more connected. A little more focused.</p></div>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">{[...LANDING_LINKS, { label: "Sign In", href: "/login" }].map((link) => <Link key={link.href} href={link.href} className="rounded-sm py-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{link.label}</Link>)}</nav>
        </div>
      </footer>
    </div>
    </LandingMotionProvider>
  );
}

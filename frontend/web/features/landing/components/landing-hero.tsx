import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LANDING_TRUST_ITEMS,
  PREVIEW_MEMBER_AVATARS,
} from "../landing-content";
import { FadeIn, FadeInStagger } from "./motion/fade-in";
import { LandingHeroDashboard } from "./motion/landing-hero-dashboard";
import { LandingHeroMotion } from "./motion/landing-hero-motion";

export function LandingHero() {
  return (
    <>
      <section
        aria-labelledby="hero-heading"
        className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[0.94fr_1.06fr]"
      >
        <div className="text-center lg:text-left">
          <FadeIn trigger="mount" preset="hero">
            <span className="inline-flex items-center gap-2 rounded-full border border-info-outline/40 bg-info-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-info-content">
              <span className="size-1.5 animate-pulse rounded-full bg-info-content" />
              Your all-in-one smart workspace
            </span>
          </FadeIn>

          <LandingHeroMotion
            heading={
              <h1
                id="hero-heading"
                className="mt-6 text-balance text-[clamp(2.75rem,5vw,4.5rem)] font-bold leading-[1.08] tracking-[-0.04em] text-foreground"
              >
                One workspace.
                <br />
                <span className="text-link">Every great idea.</span>
              </h1>
            }
            description={
              <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted-foreground lg:mx-0">
                Plan projects, collaborate with your team, manage documents and
                stay focused. Everything connected in one intelligent workspace,
                powered by AI.
              </p>
            }
            actions={
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="landing-action h-12 w-full gap-2.5 px-6 text-sm font-semibold sm:w-auto"
                >
                  <Link href="/register">
                    Start for free
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="landing-action h-12 w-full gap-2.5 bg-card px-5 text-sm font-semibold sm:w-auto"
                >
                  <Link href="#product">
                    Explore the platform
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
              </div>
            }
          />

          <FadeIn trigger="mount" delay={0.25} preset="hero">
            <div className="mt-7 flex items-center justify-center gap-3 text-xs text-muted-foreground lg:justify-start">
              <div className="flex -space-x-2" aria-hidden="true">
                {PREVIEW_MEMBER_AVATARS.map((member) => (
                  <Image
                    key={member.name}
                    src={member.src}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 rounded-full border-2 border-background bg-card object-cover shadow-2xs transition-transform duration-150 hover:z-10 hover:scale-110"
                  />
                ))}
              </div>
              <span>Built for students, creators and growing teams</span>
            </div>
          </FadeIn>
        </div>

        <LandingHeroDashboard />
      </section>

      <div className="border-y border-border bg-card py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-around gap-6 px-5 text-xs font-bold text-muted-foreground sm:px-8">
          <FadeIn>
            <span className="tracking-wider uppercase">
              One connected workspace
            </span>
          </FadeIn>
          <FadeInStagger stagger={0.08}>
            {LANDING_TRUST_ITEMS.map(({ label, icon: Icon }) => (
              <FadeIn key={label}>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon aria-hidden="true" className="size-4 text-link" />
                  {label}
                </span>
              </FadeIn>
            ))}
          </FadeInStagger>
        </div>
      </div>
    </>
  );
}

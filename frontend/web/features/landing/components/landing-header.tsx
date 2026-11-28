import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANDING_LINKS } from "../landing-content";
import { WorkspaceLogo } from "@/components/common/workspace-logo";
import { SlideIn } from "./motion/slide-in";

export function LandingLogo() {
  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-xl bg-brand-blue text-lg font-bold text-brand-ice"
      >
        <WorkspaceLogo alt="" className="size-10" />
      </span>
      <span className="text-lg font-bold tracking-tight text-foreground">
        WorkspaceHub
      </span>
    </Link>
  );
}

export function LandingHeader() {
  return (
    <SlideIn from="top" trigger="mount" duration={0.45} distance={14}>
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:h-22 sm:px-8">
        <LandingLogo />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground lg:flex"
        >
          {LANDING_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm py-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            variant="ghost"
            className="hidden font-semibold sm:inline-flex"
          >
            <Link href="/login">Sign in</Link>
          </Button>
          <Button
            asChild
            className="landing-action h-10 gap-1.5 px-4 text-xs font-semibold sm:text-sm"
          >
            <Link href="/register">
              Get started
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>
      </header>
    </SlideIn>
  );
}

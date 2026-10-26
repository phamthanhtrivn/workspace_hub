import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANDING_LINKS } from "../landing-content";

export function LandingLogo() {
  return (
    <Link href="/" aria-label="WorkspaceHub home" className="inline-flex shrink-0 items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-blue text-lg font-bold text-brand-ice sm:size-10">W</span>
      <span className="text-base font-semibold tracking-tight sm:text-lg">WorkspaceHub</span>
    </Link>
  );
}

export function LandingHeader() {
  return (
    <header className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:h-24 sm:px-8">
      <LandingLogo />
      <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm text-muted-foreground lg:flex">
        {LANDING_LINKS.map((link) => <Link key={link.href} href={link.href} className="rounded-sm py-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{link.label}</Link>)}
      </nav>
      <div className="flex items-center gap-2 sm:gap-4">
        <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/login">Sign In</Link></Button>
        <Button asChild className="landing-action h-10 px-3 text-xs sm:px-4 sm:text-sm"><Link href="/register">Get Started<ArrowUpRight aria-hidden="true" className="hidden sm:block" /></Link></Button>
      </div>
    </header>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChevronDown,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceLogo } from "@/components/common/workspace-logo";
import { WORKSPACE_NAVIGATION_ITEMS } from "@/components/layout/workspace-navigation";
import { LANDING_TRUST_ITEMS, PREVIEW_MEMBERS } from "../landing-content";
import { LandingHeroMotion } from "./motion/landing-hero-motion";

const HERO_TASKS = [
  { title: "Design project dashboard", badge: "Today", done: false },
  { title: "Review API integration", badge: null, done: false },
  { title: "Update presentation", badge: null, done: false },
  { title: "Prepare sprint summary", badge: null, done: true },
] as const;

const HERO_CALENDAR_DAYS = [
  23, 24, 25, 26, 27, 28, 29, 30, 1, 2, 3, 4, 5, 6,
] as const;

export function LandingHero() {
  return (
    <>
      <section
        aria-labelledby="hero-heading"
        className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[0.94fr_1.06fr]"
      >
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-info-outline/40 bg-info-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-info-content">
            <span className="size-1.5 rounded-full bg-info-content" />
            Your all-in-one smart workspace
          </span>

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

          <div className="mt-7 flex items-center justify-center gap-3 text-xs text-muted-foreground lg:justify-start">
            <div className="flex -space-x-2" aria-hidden="true">
              {PREVIEW_MEMBERS.map((member) => (
                <span
                  key={member}
                  className="inline-flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary-soft text-[10px] font-bold text-primary-soft-foreground"
                >
                  {member.slice(0, 1)}
                </span>
              ))}
            </div>
            <span>Built for students, creators and growing teams</span>
          </div>
        </div>

        <div className="relative">
          <div
            aria-label="Illustrated WorkspaceHub dashboard preview"
            className="grid min-h-[380px] overflow-hidden rounded-panel border border-border bg-card shadow-dialog lg:[transform:perspective(1100px)_rotateY(-4deg)_rotateX(2deg)] sm:grid-cols-[150px_1fr]"
          >
            <aside className="hidden border-r border-border bg-sidebar p-3 sm:block">
              <div className="mb-5 flex items-center gap-2 text-xs font-bold text-foreground">
                <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-control bg-brand-blue">
                  <WorkspaceLogo alt="" className="size-6" />
                </span>
                <span className="truncate">WorkspaceHub</span>
              </div>
              <div className="space-y-1">
                {WORKSPACE_NAVIGATION_ITEMS.slice(0, 7).map(
                  ({ id, label, icon: Icon }) => {
                    const active = id === "dashboard";

                    return (
                      <div
                        key={id}
                        className={`flex items-center gap-2 rounded-control px-2 py-1.5 text-[11px] ${active ? "bg-primary-soft font-semibold text-primary-soft-foreground" : "text-muted-foreground"}`}
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        <span className="truncate">{label}</span>
                      </div>
                    );
                  },
                )}
              </div>
            </aside>

            <div className="min-w-0 p-4 sm:p-5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Workspace / Dashboard</span>
                <span className="flex items-center gap-2">
                  <Search aria-hidden="true" className="size-3.5" />
                  <Bell aria-hidden="true" className="size-3.5" />
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary-soft-foreground">
                    T
                  </span>
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Sun
                  aria-hidden="true"
                  className="size-4 text-warning-content"
                />
                <p className="text-base font-bold tracking-tight text-foreground">
                  Good morning, Tri
                </p>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Here&apos;s what&apos;s happening in your workspace today.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <div className="rounded-control border border-border bg-background p-2.5">
                  <span className="text-[10px] text-muted-foreground">
                    Active projects
                  </span>
                  <strong className="mt-1 block text-lg font-bold tabular-nums text-foreground">
                    04
                  </strong>
                  <span className="text-[10px] text-success-content">
                    On track
                  </span>
                </div>
                <div className="rounded-control border border-border bg-background p-2.5">
                  <span className="text-[10px] text-muted-foreground">
                    Tasks completed
                  </span>
                  <strong className="mt-1 block text-lg font-bold tabular-nums text-foreground">
                    18
                    <span className="text-xs font-normal text-muted-foreground">
                      /24
                    </span>
                  </strong>
                  <span className="text-[10px] text-link">75% progress</span>
                </div>
                <div className="rounded-control border border-border bg-background p-2.5">
                  <span className="text-[10px] text-muted-foreground">
                    Focus time
                  </span>
                  <strong className="mt-1 block text-lg font-bold tabular-nums text-foreground">
                    6.5h
                  </strong>
                  <span className="text-[10px] text-muted-foreground">
                    This week
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-[1.25fr_1fr]">
                <div className="rounded-control border border-border bg-background p-3">
                  <p className="mb-2 text-[11px] font-bold text-foreground">
                    My tasks
                  </p>
                  <div className="divide-y divide-border">
                    {HERO_TASKS.map((task) => (
                      <div
                        key={task.title}
                        className="flex items-center gap-2 py-1.5 text-[10px]"
                      >
                        <span
                          className={`size-3 shrink-0 rounded-sm border ${task.done ? "border-primary bg-primary" : "border-input"}`}
                        />
                        <span
                          className={`truncate ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                        >
                          {task.title}
                        </span>
                        {task.badge && (
                          <span className="ml-auto rounded-full bg-info-soft px-1.5 py-0.5 text-[9px] font-semibold text-info-content">
                            {task.badge}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-control border border-border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-foreground">
                    <span>November 2026</span>
                    <ChevronDown aria-hidden="true" className="size-3" />
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-muted-foreground">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <span key={i} className="font-semibold">
                        {d}
                      </span>
                    ))}
                    {HERO_CALENDAR_DAYS.map((day) => (
                      <span
                        key={day}
                        className={`rounded py-1 tabular-nums ${day === 26 ? "bg-primary font-bold text-primary-foreground" : ""}`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 inline-flex items-center gap-2.5 rounded-panel border border-border bg-card px-3.5 py-2.5 shadow-panel sm:absolute sm:-right-4 sm:bottom-8 sm:mt-0">
            <span className="grid size-8 place-items-center rounded-control bg-info-soft text-info-content">
              <Sparkles aria-hidden="true" className="size-4" />
            </span>
            <div className="text-xs">
              <p className="font-bold text-foreground">AI has your back</p>
              <p className="text-[11px] text-muted-foreground">
                Plan smarter. Work better.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-y border-border bg-card py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-around gap-6 px-5 text-xs font-bold text-muted-foreground sm:px-8">
          <span className="tracking-wider uppercase">
            One connected workspace
          </span>
          {LANDING_TRUST_ITEMS.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              <Icon aria-hidden="true" className="size-4 text-link" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

"use client";

import Image from "next/image";
import { useState, type PointerEvent } from "react";
import { m, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Bell, Check, ChevronDown, Search, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceLogo } from "@/components/common/workspace-logo";
import { WORKSPACE_NAVIGATION_ITEMS } from "@/components/layout/workspace-navigation";
import { useLandingMotionPreferences } from "./landing-motion-provider";
import { LANDING_MOTION } from "./motion-config";

interface HeroTask {
  id: string;
  title: string;
  badge: string | null;
  done: boolean;
}

const INITIAL_HERO_TASKS: HeroTask[] = [
  {
    id: "design",
    title: "Design project dashboard",
    badge: "Today",
    done: false,
  },
  { id: "api", title: "Review API integration", badge: null, done: false },
  { id: "deck", title: "Update presentation", badge: null, done: false },
  { id: "sprint", title: "Prepare sprint summary", badge: null, done: true },
];

const HERO_CALENDAR_DAYS = [
  23, 24, 25, 26, 27, 28, 29, 30, 1, 2, 3, 4, 5, 6,
] as const;

const AI_TIPS = [
  "Plan smarter. Work better.",
  "3 tasks prioritized for today.",
  "Next focus block: 25 min.",
] as const;

const BASE_COMPLETED_TASKS = 17;
const TOTAL_TASKS = 24;

export function LandingHeroDashboard() {
  const { mobile, reducedMotion } = useLandingMotionPreferences();
  const [activeNavId, setActiveNavId] = useState<string>("dashboard");
  const [tasks, setTasks] = useState<HeroTask[]>(() =>
    INITIAL_HERO_TASKS.map((task) => ({ ...task })),
  );
  const [selectedDay, setSelectedDay] = useState<number>(26);
  const [tipIndex, setTipIndex] = useState<number>(0);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 180, damping: 24 });
  const smoothY = useSpring(pointerY, { stiffness: 180, damping: 24 });

  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-7, 3]);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [5, -3]);

  const activeNav =
    WORKSPACE_NAVIGATION_ITEMS.find((item) => item.id === activeNavId) ??
    WORKSPACE_NAVIGATION_ITEMS[0];

  const completedInList = tasks.filter((task) => task.done).length;
  const completedCount = BASE_COMPLETED_TASKS + completedInList;
  const progressPercent = Math.round((completedCount / TOTAL_TASKS) * 100);

  const enableTilt = !mobile && !reducedMotion;

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!enableTilt) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(x);
    pointerY.set(y);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  function toggleTask(taskId: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task,
      ),
    );
  }

  return (
    <m.div
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.15, ease: LANDING_MOTION.ease }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative [perspective:1100px]"
    >
      <m.div
        aria-label="Interactive WorkspaceHub dashboard preview"
        style={
          enableTilt
            ? {
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }
            : undefined
        }
        className="grid min-h-[380px] overflow-hidden rounded-panel border border-border bg-card shadow-dialog transition-shadow duration-300 hover:shadow-xl sm:grid-cols-[150px_1fr]"
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
                const active = id === activeNavId;

                return (
                  <m.button
                    key={id}
                    type="button"
                    onClick={() => setActiveNavId(id)}
                    whileHover={reducedMotion ? undefined : { x: 2 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-left text-[11px] transition-colors ${
                      active
                        ? "bg-primary-soft font-semibold text-primary-soft-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </m.button>
                );
              },
            )}
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <m.span
              key={activeNav.id}
              initial={reducedMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              Workspace / {activeNav.label}
            </m.span>
            <span className="flex items-center gap-2">
              <Search aria-hidden="true" className="size-3.5" />
              <Bell aria-hidden="true" className="size-3.5" />
              <Image
                src="/assets/avatars/tri.svg"
                alt="Tri"
                width={24}
                height={24}
                className="size-6 rounded-full border border-border object-cover"
              />
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Sun aria-hidden="true" className="size-4 text-warning-content" />
            <p className="text-base font-bold tracking-tight text-foreground">
              Good morning, Tri
            </p>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Here&apos;s what&apos;s happening in your workspace today.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <m.div
              whileHover={reducedMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.15 }}
              className="rounded-control border border-border bg-background p-2.5"
            >
              <span className="text-[10px] text-muted-foreground">
                Active projects
              </span>
              <strong className="mt-1 block text-lg font-bold tabular-nums text-foreground">
                04
              </strong>
              <span className="text-[10px] text-success-content">On track</span>
            </m.div>
            <m.div
              whileHover={reducedMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.15 }}
              className="rounded-control border border-border bg-background p-2.5"
            >
              <span className="text-[10px] text-muted-foreground">
                Tasks completed
              </span>
              <strong className="mt-1 block text-lg font-bold tabular-nums text-foreground">
                {completedCount}
                <span className="text-xs font-normal text-muted-foreground">
                  /{TOTAL_TASKS}
                </span>
              </strong>
              <span className="text-[10px] text-link">
                {progressPercent}% progress
              </span>
            </m.div>
            <m.div
              whileHover={reducedMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.15 }}
              className="rounded-control border border-border bg-background p-2.5"
            >
              <span className="text-[10px] text-muted-foreground">
                Focus time
              </span>
              <strong className="mt-1 block text-lg font-bold tabular-nums text-foreground">
                6.5h
              </strong>
              <span className="text-[10px] text-muted-foreground">
                This week
              </span>
            </m.div>
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-[1.25fr_1fr]">
            <div className="rounded-control border border-border bg-background p-3">
              <p className="mb-2 text-[11px] font-bold text-foreground">
                My tasks
              </p>
              <div className="divide-y divide-border">
                {tasks.map((task) => (
                  <Button
                    key={task.id}
                    type="button"
                    variant="ghost"
                    onClick={() => toggleTask(task.id)}
                    className="h-auto w-full justify-start gap-2 rounded-none px-0 py-1.5 text-left text-[10px] font-normal hover:bg-muted/40"
                  >
                    <m.span
                      animate={
                        reducedMotion
                          ? undefined
                          : { scale: task.done ? [1, 1.15, 1] : 1 }
                      }
                      transition={{ duration: 0.2 }}
                      className={`grid size-3.5 shrink-0 place-items-center rounded-sm border transition-colors ${
                        task.done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-card"
                      }`}
                    >
                      {task.done && (
                        <Check aria-hidden="true" className="size-2.5" />
                      )}
                    </m.span>
                    <span
                      className={`truncate transition-colors ${
                        task.done
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.badge && (
                      <span className="ml-auto rounded-full bg-info-soft px-1.5 py-0.5 text-[9px] font-semibold text-info-content">
                        {task.badge}
                      </span>
                    )}
                  </Button>
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
                {HERO_CALENDAR_DAYS.map((day) => {
                  const isSelected = day === selectedDay;

                  return (
                    <m.button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      whileHover={reducedMotion ? undefined : { scale: 1.1 }}
                      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                      className={`cursor-pointer rounded py-1 tabular-nums transition-colors ${
                        isSelected
                          ? "bg-primary font-bold text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      {day}
                    </m.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </m.div>

      <m.button
        type="button"
        onClick={() => setTipIndex((prev) => (prev + 1) % AI_TIPS.length)}
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={
          reducedMotion
            ? { opacity: 1, y: 0 }
            : {
                opacity: 1,
                y: [0, -5, 0],
              }
        }
        transition={
          reducedMotion
            ? { duration: 0.2 }
            : {
                opacity: { duration: 0.5, delay: 0.45 },
                y: {
                  duration: 3.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.6,
                },
              }
        }
        whileHover={reducedMotion ? undefined : { y: -4, scale: 1.03 }}
        whileTap={reducedMotion ? undefined : { scale: 0.98 }}
        className="mt-3 inline-flex cursor-pointer items-center gap-2.5 rounded-panel border border-border bg-card px-3.5 py-2.5 text-left shadow-panel transition-shadow hover:shadow-dialog sm:absolute sm:-right-4 sm:bottom-8 sm:mt-0"
      >
        <span className="grid size-8 place-items-center rounded-control bg-info-soft text-info-content">
          <Sparkles aria-hidden="true" className="size-4" />
        </span>
        <div className="text-xs">
          <p className="font-bold text-foreground">AI has your back</p>
          <p className="text-[11px] text-muted-foreground">
            {AI_TIPS[tipIndex]}
          </p>
        </div>
      </m.button>
    </m.div>
  );
}

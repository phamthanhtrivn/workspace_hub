import { useId, type CSSProperties } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DashboardActivity } from "../../utils/dashboard-activity.utils";
import styles from "./dashboard-activity-calendar.module.css";
import { DashboardDisclosure } from "../common/dashboard-disclosure";

const ACTIVITY_LEVELS = [0, 1, 2, 3, 4];
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function DashboardActivityCalendar({ activity }: { activity: DashboardActivity }) {
  const captionId = useId();
  const summary = `${activity.total} tasks completed across ${activity.activeDays} active days. ${activity.rangeLabel}.`;
  return (
    <figure className={`${styles.calendar} min-w-0 space-y-4`}>
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="text-2xl font-semibold text-foreground tabular-nums">{activity.total}</span>{" "}
          {activity.total === 1 ? "task" : "tasks"} completed
        </p>
        <p className="text-xs text-muted-foreground">{activity.activeDays} {activity.activeDays === 1 ? "active day" : "active days"} in this period</p>
      </div>
      <figcaption id={captionId} className="sr-only">{summary} Each square is a day. Today is outlined. Open Daily totals for exact counts.</figcaption>
      <div role="region" tabIndex={0} aria-label="Six-month task activity calendar" aria-describedby={captionId}
        className="min-w-0 max-w-full overflow-x-auto rounded-control p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div role="img" aria-label={summary} className={styles.layout} style={{ "--activity-weeks": activity.weekCount } as CSSProperties}>
          <div aria-hidden="true" className={`${styles.months} text-xs text-muted-foreground`}>
            {activity.months.map((month) => <span key={`${month.label}-${month.column}`} style={{ gridColumn: month.column }}>{month.label}</span>)}
          </div>
          <div aria-hidden="true" className={`${styles.weekdays} text-xs text-muted-foreground`}>
            {WEEKDAY_LABELS.map((label, index) => <span key={index}>{label}</span>)}
          </div>
          <TooltipProvider>
            <div className={styles.days}>
              {activity.days.map((day) => {
                if (!day.inRange) return <span key={day.date} aria-hidden="true" className={styles.cell} />;
                const description = `${day.isToday ? "Today: " : ""}${day.count} ${day.count === 1 ? "task" : "tasks"} completed on ${day.label}`;
                return (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <span tabIndex={-1} aria-label={description} className={styles.cell} data-today={day.isToday || undefined}
                        style={{ backgroundColor: `var(--activity-${day.level})` }} />
                    </TooltipTrigger>
                    <TooltipContent>{description}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{activity.rangeLabel}</span>
        <span className="flex items-center gap-[3px]" aria-label="Daily activity levels: 0, 1, 2, 3, 4 or more completed tasks">
          <span className="mr-1">Less</span>
          {ACTIVITY_LEVELS.map((level) => <span key={level} aria-hidden="true" className={styles.cell} style={{ backgroundColor: `var(--activity-${level})` }} />)}
          <span className="ml-1">More</span>
        </span>
      </div>
      <DashboardDisclosure title="Daily totals" className="text-xs text-muted-foreground">
        <ul className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          {activity.days.filter((day) => day.inRange).map((day) => (
            <li key={day.date} className="min-w-0 break-words tabular-nums">
              <time dateTime={day.date}>{day.label}</time>{day.isToday ? " (Today)" : ""}: {day.count} {day.count === 1 ? "task" : "tasks"}
            </li>
          ))}
        </ul>
      </DashboardDisclosure>
    </figure>
  );
}

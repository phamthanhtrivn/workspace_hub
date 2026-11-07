import Link from "next/link";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { TaskReference, WorkOverview, WorkTask } from "../types";
export function taskHref(source: TaskReference) {
  if (source.kind === "project" && source.projectId)
    return "/projects/" + source.projectId + "?taskId=" + source.id;
  const timestamp = /[?&]t=(\d+)/.exec(source.url)?.[1];
  return (
    "/calendar?eventId=" + source.id + (timestamp ? "&t=" + timestamp : "")
  );
}
export function taskReason(task: WorkTask) {
  if (task.overdue) return "Overdue";
  if (task.dueToday) return "Due today";
  if (task.blockedBy.length)
    return "Blocked by " + task.blockedBy.length + " tasks";
  if (task.priority === "URGENT") return "Urgent priority";
  if (task.priority === "HIGH") return "High priority";
  if (task.unblocks) return "Has " + task.unblocks + " dependent tasks";
  return task.dueAt ? "Prepare before the deadline" : "No due date";
}
const stateText = {
  ready: "Updated",
  empty: "No data",
  partial: "Limited details",
  unavailable: "Unavailable",
};
export default function WorkToday({
  data,
}: {
  data: WorkOverview;
}) {
  return (
    <Collapsible className="border-b bg-muted/25">
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <span>Today <span className="ml-2 text-xs font-normal text-muted-foreground">{data.date}</span></span>
        <ChevronDown className="size-4 text-muted-foreground group-data-[state=open]:rotate-180" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 px-4 pb-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>
              Project: {data.metrics.project?.open ?? "—"} open tasks
            </span>
            {!data.scope.projectId && (
              <span>Calendar: {data.metrics.personal?.open ?? "—"} tasks</span>
            )}
            <span>
              Focus (7 days):{" "}
              {data.metrics.focusSeconds === null
                ? "—"
                : Math.round(data.metrics.focusSeconds / 60) + " min"}
            </span>
          </div>
          <div className="space-y-2">
            {data.tasks.slice(0, 4).map((task) => (
              <Link
                key={task.kind + task.id}
                href={taskHref(task)}
                className="block rounded-lg p-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {taskReason(task)}
                  {task.dueAt
                    ? " · " +
                      new Intl.DateTimeFormat("en-US", {
                        timeZone: data.timeZone,
                        day: "2-digit",
                        month: "2-digit",
                        ...(task.allDay
                          ? {}
                          : {
                              hour: "2-digit" as const,
                              minute: "2-digit" as const,
                            }),
                      }).format(
                        new Date(
                          Date.parse(task.dueAt) -
                            (task.kind === "calendar" && task.allDay ? 1 : 0),
                        ),
                      )
                    : ""}
                </p>
              </Link>
            ))}
          </div>
          {!data.tasks.length && (
            <p className="text-xs text-muted-foreground">
              {data.sources.project.state === "unavailable" ||
              data.sources.calendar.state === "unavailable"
                ? "Some task data is unavailable."
                : "No open tasks."}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Project: {stateText[data.sources.project.state]} · Calendar:{" "}
            {stateText[data.sources.calendar.state]}
          </p>
          {data.detailPartial && (
            <p className="text-xs text-muted-foreground">
              Some task details are unavailable. Totals include all tasks you can access.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Updated{" "}
            {new Intl.DateTimeFormat("en-US", {
              timeZone: data.timeZone,
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(data.fetchedAt))}{" "}
            · {data.timeZone}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

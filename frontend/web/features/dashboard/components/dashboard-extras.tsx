"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, FolderKanban, Rocket } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Notification } from "@/features/notification/types/notification.types";
import { markAsRead } from "@/features/notification/api/notification.api";
import { useAppDispatch } from "@/store/store";
import { markReadSuccess } from "@/store/notification/notification.slice";
import { notificationKeys } from "@/features/notification/hooks/use-notification-actions";
import { useDashboardExtras } from "../hooks/use-dashboard-extras";
import { DashboardPanel, EmptyState, QueryFeedback } from "./dashboard-panel";
import type { useDashboard } from "../hooks/use-dashboard";
import { DashboardNotificationDialog } from "./dashboard-notification-dialog";
import { DashboardProjectActivity } from "./dashboard-project-activity";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";


export function DashboardExtras({
  dashboard,
}: {
  dashboard: ReturnType<typeof useDashboard>;
}) {
  const extras = useDashboardExtras(dashboard.auth.userId);
  const [notification, setNotification] = useState<Notification | null>(null);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: (_, notificationId) => {
      dispatch(markReadSuccess(notificationId));
      void queryClient.invalidateQueries({ queryKey: notificationKeys.root });
    },
    onError: (_error, notificationId): void => {
      toast.error("Notification opened, but could not mark it as read.", {
        action: {
          label: "Retry",
          onClick: () => markReadMutation.mutate(notificationId),
        },
        actionButtonStyle: { cursor: "pointer" },
      });
    },
  });
  const projects = (extras.projects.data?.data || [])
    .filter((project) => !project.archived)
    .slice(0, 3);
  const openNotification = (item: Notification) => {
    setNotification(item);
    if (!item.isRead) markReadMutation.mutate(item.id);
  };
  return (
    <>
      <DashboardPanel title="Active projects" href="/projects">
        <QueryFeedback query={extras.projects} label="projects" />
        {extras.projects.isSuccess && !projects.length && (
          <EmptyState>
            No active projects yet. Open Projects to get started.
          </EmptyState>
        )}
        <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-3">
          {projects.map((project, index) => {
            const query = extras.counts[index];
            const counts = query?.data;
            const total = counts
              ? counts.TODO +
                counts.IN_PROGRESS +
                counts.IN_REVIEW +
                counts.DONE
              : 0;
            const progress =
              total && counts ? Math.round((counts.DONE / total) * 100) : 0;
            return (
              <div
                key={project.id}
                className="min-w-0 rounded-lg p-3 transition-colors hover:bg-muted"
              >
                <Link
                  href={`/projects/${encodeURIComponent(project.id)}`}
                  className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 text-sm font-semibold text-foreground hover:text-link sm:min-h-10 [@media(pointer:coarse)]:min-h-11"
                >
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-secondary text-xl"
                    style={{ color: project.color || "var(--chart-1)" }}
                  >
                    {project.icon &&
                    /\p{Extended_Pictographic}/u.test(project.icon) ? (
                      project.icon
                    ) : project.icon === "rocket" ? (
                      <Rocket size={21} />
                    ) : (
                      <FolderKanban size={21} />
                    )}
                  </span>
                  <span className="truncate">{project.name}</span>
                </Link>
                {query && (
                  <QueryFeedback
                    query={query}
                    label={`${project.name} progress`}
                  />
                )}
                {counts && (
                  <>
                    <div className="mt-4 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {counts.DONE} / {total} tasks completed
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress}

                      aria-label={`${project.name} completion`}



                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-primary ring-1 ring-inset ring-input"
                        style={{
                          width: `${progress}%`,
                          backgroundColor:
                            project.color || "var(--chart-1)",
                        }}
                      />
                    </Progress>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {counts.IN_PROGRESS} in progress · {counts.IN_REVIEW} in
                      review
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </DashboardPanel>
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <DashboardPanel
          title="Recent activity"
          description="Your latest notifications"
        >
          <QueryFeedback query={extras.notifications} label="notifications" />
          {extras.notifications.isSuccess &&
            !extras.notifications.data.data.length && (
              <EmptyState>No recent notifications.</EmptyState>
            )}
          <ul className="space-y-1">
            {extras.notifications.data?.data.map((item) => (
              <li key={item.id}>
                <Button variant="unstyled"
                  type="button"
                  onClick={() => openNotification(item)}
                  className={`flex w-full min-w-0 cursor-pointer flex-wrap items-start gap-3 rounded-control p-3 text-left hover:bg-muted ${item.isRead ? "" : "bg-info-soft"}`}
                >
                  <Bell size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 basis-24">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {item.content}
                    </span>
                  </span>
                  <time
                    dateTime={item.createdAt}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {new Intl.DateTimeFormat("en", {
                      timeZone: dashboard.zone,
                      month: "short",
                      day: "numeric",
                    }).format(new Date(item.createdAt))}
                  </time>
                </Button>
              </li>
            ))}
          </ul>
        </DashboardPanel>
        <DashboardProjectActivity
          today={dashboard.today}
          zone={dashboard.zone}
        />
      </div>
      {notification && (
        <DashboardNotificationDialog
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
}

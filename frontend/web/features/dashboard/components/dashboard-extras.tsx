"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, FolderKanban, Rocket } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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

export function DashboardExtras({
  dashboard,
}: {
  dashboard: ReturnType<typeof useDashboard>;
}) {
  const extras = useDashboardExtras(dashboard.auth.userId);
  const [notification, setNotification] = useState<Notification | null>(null);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const projects = (extras.projects.data?.data || [])
    .filter((project) => !project.archived)
    .slice(0, 3);
  const openNotification = (item: Notification) => {
    setNotification(item);
    if (!item.isRead)
      void markAsRead(item.id)
        .then(() => {
          dispatch(markReadSuccess(item.id));
          void queryClient.invalidateQueries({
            queryKey: notificationKeys.root,
          });
        })
        .catch(() => undefined);
  };
  return (
    <>
      <DashboardPanel title="Active projects" href="/projects">
        <QueryFeedback query={extras.projects} label="projects" />
        {extras.projects.isSuccess && !projects.length && (
          <EmptyState>No active projects yet.</EmptyState>
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
                  className="flex min-h-11 min-w-0 items-center gap-3 text-sm font-semibold text-foreground hover:text-link sm:min-h-10 [@media(pointer:coarse)]:min-h-11"
                >
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/5 text-xl"
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
                    <div
                      role="progressbar"
                      aria-label={`${project.name} completion`}
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
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
                    </div>
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
                <button
                  type="button"
                  onClick={() => openNotification(item)}
                  className={`flex w-full items-start gap-3 rounded-control p-3 text-left hover:bg-background ${item.isRead ? "" : "bg-info-soft/50"}`}
                >
                  <Bell size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
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
                </button>
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

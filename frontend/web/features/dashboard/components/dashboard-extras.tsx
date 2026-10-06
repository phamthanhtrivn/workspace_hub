"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Folder, Bell, FolderKanban, Rocket } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { FilePreviewModal } from "@/features/documents/components/preview/file-preview-modal";
import type { DocumentItem } from "@/features/documents/types/documents.types";
import type { Notification } from "@/features/notification/types/notification.types";
import { markAsRead } from "@/features/notification/api/notification.api";
import { useAppDispatch } from "@/store/store";
import { markReadSuccess } from "@/store/notification/notification.slice";
import { notificationKeys } from "@/features/notification/hooks/use-notification-actions";
import { useDashboardExtras } from "../hooks/use-dashboard-extras";
import { DashboardPanel, EmptyState, QueryFeedback } from "./dashboard-panel";
import type { useDashboard } from "../hooks/use-dashboard";
import { DashboardNotificationDialog } from "./dashboard-notification-dialog";

export function DashboardExtras({
  dashboard,
}: {
  dashboard: ReturnType<typeof useDashboard>;
}) {
  const extras = useDashboardExtras(dashboard.auth.userId);
  const [preview, setPreview] = useState<DocumentItem | null>(null);
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
        <div className="grid gap-5 md:grid-cols-3">
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
                className="min-w-0 rounded-lg p-3 transition-colors hover:bg-muted/50"
              >
                <Link
                  href={`/projects/${encodeURIComponent(project.id)}`}
                  className="flex min-w-0 items-center gap-3 text-sm font-semibold text-slate-800 hover:text-primary"
                >
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/5 text-xl"
                    style={{ color: project.color || "var(--color-primary)" }}
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
                    <div className="mt-4 flex justify-between text-xs text-slate-500">
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
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${progress}%`,
                          backgroundColor:
                            project.color || "var(--color-primary)",
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
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
      <div className="grid gap-6">
        <DashboardPanel
          title="Recent documents"
          href="/documents"
          description="Recently added to your files"
        >
          <QueryFeedback query={extras.documents} label="documents" />
          {extras.documents.isSuccess && !extras.documents.data.data.length && (
            <EmptyState>No recent documents.</EmptyState>
          )}
          <ul className="space-y-1">
            {extras.documents.data?.data
              .filter((item) => !item.isArchived)
              .map((item) => (
                <li key={item.id}>
                  {item.type === "FOLDER" ? (
                    <Link
                      href={`/documents?folderId=${encodeURIComponent(item.id)}`}
                      className="flex items-center gap-3 rounded-lg p-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Folder size={18} className="shrink-0 text-slate-400" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreview(item)}
                      className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <FileText size={18} className="shrink-0 text-slate-400" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </DashboardPanel>
      </div>
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
                className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-slate-50 ${item.isRead ? "" : "bg-blue-50/50"}`}
              >
                <Bell size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-700">
                    {item.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {item.content}
                  </span>
                </span>
                <time
                  dateTime={item.createdAt}
                  className="shrink-0 text-xs text-slate-500"
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
      <FilePreviewModal
        open={Boolean(preview)}
        item={preview}
        onClose={() => setPreview(null)}
      />
      {notification && (
        <DashboardNotificationDialog
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAppSelector } from "@/store/store";
import { getProjects } from "../api/project.api";
import {
  applyTaskSocketEvent,
  projectQueriesForEvent,
} from "../api/project-realtime";
import {
  projectSocketService,
  type ProjectChangedEvent,
} from "../api/project-socket.service";
import { projectKeys } from "../hooks/use-projects";
import { taskKeys } from "../hooks/use-tasks";
import type { Task } from "../types/project";

export default function ProjectRealtimeManager() {
  const token = useAppSelector((state) => state.auth.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      projectSocketService.disconnect();
      return;
    }

    const socket = projectSocketService.connect(token);
    const syncProjects = async () => {
      try {
        const projects = await queryClient.fetchQuery({
          queryKey: projectKeys.all,
          queryFn: getProjects,
        });
        projectSocketService.syncProjects(
          projects.map((project) => project.id),
        );
      } catch {
        // The normal query error state remains the source of user-facing feedback.
      }
    };
    const handleChange = (event: ProjectChangedEvent) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[ProjectRealtime] Received event:",
          event.resource,
          event.action,
          event,
        );
      }
      if (event.resource === "TASK") {
        queryClient.setQueryData<Task[]>(
          taskKeys.project(event.projectId),
          (current) => applyTaskSocketEvent(current, event),
        );
      }
      for (const invalidation of projectQueriesForEvent(event)) {
        void queryClient.invalidateQueries(invalidation);
      }
      if (
        event.resource === "PROJECT" ||
        event.resource === "MEMBER" ||
        event.resource === "INVITATION"
      ) {
        void syncProjects();
      }
    };

    socket.on("connect", syncProjects);
    socket.on("project:changed", handleChange);
    if (socket.connected) void syncProjects();

    return () => {
      socket.off("connect", syncProjects);
      socket.off("project:changed", handleChange);
      projectSocketService.disconnect();
    };
  }, [queryClient, token]);

  return null;
}

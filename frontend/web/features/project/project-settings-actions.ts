import { toast } from "sonner";
import { confirmProjectAction } from "./project-alert";
import type { ProjectStatus } from "./types/project";

export interface ProjectSettingsPayload {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
}

interface ProjectSettingsActionDependencies {
  formatMessage: (id: string) => string;
  update: (payload: ProjectSettingsPayload) => Promise<unknown>;
  archive: () => Promise<unknown>;
  close: () => void;
}

export function createProjectSettingsActions({
  update,
  archive,
  close,
  formatMessage,
}: ProjectSettingsActionDependencies) {
  return {
    save: async (payload: ProjectSettingsPayload) => {
      try {
        await update(payload);
        close();
        toast.success(formatMessage("project.updated"));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : formatMessage("project.updateFailed"));
      }
    },
    archive: async () => {
      const confirmed = await confirmProjectAction({
        title: formatMessage("project.archiveConfirmTitle"),
        text: formatMessage("project.archiveConfirmText"),
        confirmText: formatMessage("project.archiveAction"),
        cancelText: formatMessage("app.cancel"),
        icon: "warning",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        await archive();
        window.location.assign("/projects");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : formatMessage("project.archiveFailed"));
      }
    },
  };
}

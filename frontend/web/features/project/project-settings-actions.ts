import { toast } from "sonner";
import type { ProjectStatus } from "./types/project";

export interface ProjectSettingsPayload {
  name: string;
  color: string;
  icon: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
}

interface ProjectSettingsActionDependencies {
  update: (payload: ProjectSettingsPayload) => Promise<unknown>;
  archive: () => Promise<unknown>;
  close: () => void;
}

export function createProjectSettingsActions({
  update,
  archive,
  close,
}: ProjectSettingsActionDependencies) {
  return {
    save: async (payload: ProjectSettingsPayload) => {
      try {
        await update(payload);
        close();
        toast.success("Project settings updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update project settings");
      }
    },
    archive: async () => {
      try {
        await archive();
        toast.success("Project archived");
        window.location.assign("/projects");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to archive project");
      }
    },
  };
}

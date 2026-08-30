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
  update: (payload: ProjectSettingsPayload) => Promise<unknown>;
  archive: () => Promise<unknown>;
  close: () => void;
}

export function createProjectSettingsActions({ update, archive, close }: ProjectSettingsActionDependencies) {
  return {
    save: async (payload: ProjectSettingsPayload) => {
      try {
        await update(payload);
        close();
        toast.success("Đã cập nhật Project");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể cập nhật Project");
      }
    },
    archive: async () => {
      const confirmed = await confirmProjectAction({
        title: "Lưu trữ dự án?",
        text: "Dự án sẽ không còn xuất hiện trong danh sách đang hoạt động.",
        confirmText: "Lưu trữ",
        icon: "warning",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        await archive();
        window.location.assign("/projects");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể archive Project");
      }
    },
  };
}

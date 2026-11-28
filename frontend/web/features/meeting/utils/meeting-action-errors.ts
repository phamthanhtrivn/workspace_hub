import { isCancel } from "axios";
import { toast } from "sonner";
import { getActionErrorMessage } from "@/lib/permission-feedback";

export function showMeetingActionError(error: unknown, fallback: string): void {
  if (isCancel(error) || error instanceof Error && error.name === "AbortError") return;
  toast.error(getActionErrorMessage(error, fallback));
}

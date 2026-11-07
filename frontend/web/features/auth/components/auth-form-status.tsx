"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { AuthAction } from "../types/auth-activity.constants";
import { useAuthInteraction } from "./auth-interaction-provider";

export function AuthFormStatus({ action, excludeAction }: { action?: AuthAction; excludeAction?: AuthAction }) {
  const { activity, busy } = useAuthInteraction();
  if (!activity || (action && activity.action !== action) || activity.action === excludeAction) return null;
  return (
    <p
      role={activity.phase === "error" ? "alert" : "status"}
      aria-atomic="true"
      className={cn("flex items-start gap-2 text-sm", activity.phase === "error" ? "text-destructive-content"
        : activity.phase === "success" ? "text-success-content" : "text-muted-foreground")}
    >
      {busy && <Spinner className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <span>{activity.message}</span>
    </p>
  );
}

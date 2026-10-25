"use client";

import { Button } from "@/components/ui/button";
import { SettingSwitchCard } from "@/features/user-setting/components/ui/setting-form-controls";
import { usePomodoroNotifications } from "../hooks/use-pomodoro-notifications";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";

export function PomodoroNotificationSettings({ enabled, disabled, onChange }: {
  enabled: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const notifications = usePomodoroNotifications();
  const { permission, pending, error } = notifications;
  return <div className="space-y-3">
    <SettingSwitchCard title={copy.notifications.title} description={copy.notifications.description}
      checked={enabled} onCheckedChange={onChange} disabled={disabled || permission === "unsupported"} />
    <p role="status" className="text-xs text-muted-foreground">{copy.notifications[permission]}</p>
    {permission === "default" && <Button loading={pending} type="button" variant="outline" disabled={disabled || !enabled || pending}
      onClick={() => void notifications.requestPermission()}>{copy.notifications.enable}</Button>}
    {permission === "granted" && <Button loading={pending} type="button" variant="outline" disabled={disabled || !enabled || pending}
      onClick={notifications.testNotification}>{copy.notifications.test}</Button>}
    {error && <p role="alert" className="text-xs text-destructive-content">{error}</p>}
  </div>;
}

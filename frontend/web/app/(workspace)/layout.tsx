import WorkspaceShell from "@/components/layout/workspace-shell";
import { PomodoroConfigProvider } from "@/features/pomodoro/components/pomodoro-config-provider";
import { PomodoroSessionProvider } from "@/features/pomodoro/components/pomodoro-session-provider";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PomodoroConfigProvider><PomodoroSessionProvider><WorkspaceShell>{children}</WorkspaceShell></PomodoroSessionProvider></PomodoroConfigProvider>;
}

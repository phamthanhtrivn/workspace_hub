import WorkspaceShell from "@/components/layout/workspace-shell";
import { PomodoroConfigProvider } from "@/features/pomodoro/components/pomodoro-config-provider";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PomodoroConfigProvider><WorkspaceShell>{children}</WorkspaceShell></PomodoroConfigProvider>;
}

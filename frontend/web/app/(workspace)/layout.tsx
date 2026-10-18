import { PRIVATE_ROBOTS } from "@/lib/seo";
import WorkspaceShell from "@/components/layout/workspace-shell";
import { PomodoroConfigProvider } from "@/features/pomodoro/components/pomodoro-config-provider";
import { PomodoroSessionProvider } from "@/features/pomodoro/components/pomodoro-session-provider";

export const metadata = { robots: PRIVATE_ROBOTS };

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PomodoroConfigProvider><PomodoroSessionProvider><WorkspaceShell>{children}</WorkspaceShell></PomodoroSessionProvider></PomodoroConfigProvider>;
}

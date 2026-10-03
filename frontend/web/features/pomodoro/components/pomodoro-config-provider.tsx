"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAppSelector } from "@/store/store";
import { usePomodoroConfigState } from "../hooks/use-pomodoro-config-state";

const PomodoroConfigContext = createContext<ReturnType<typeof usePomodoroConfigState> | null>(null);

function UserPomodoroConfigProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const config = usePomodoroConfigState(userId);
  return <PomodoroConfigContext.Provider value={config}>{children}</PomodoroConfigContext.Provider>;
}

export function PomodoroConfigProvider({ children }: { children: ReactNode }) {
  const userId = useAppSelector((state) => state.auth.userId);
  return <UserPomodoroConfigProvider key={userId ?? "signed-out"} userId={userId}>{children}</UserPomodoroConfigProvider>;
}

export function usePomodoroConfig() {
  const context = useContext(PomodoroConfigContext);
  if (!context) throw new Error("PomodoroConfigProvider is required");
  return context;
}

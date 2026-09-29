// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PomodoroConfig } from "../types/pomodoro";
import { PomodoroSettingsDialog } from "./pomodoro-settings-dialog";

afterEach(cleanup);

it("clamps the long-break interval to two sessions", async () => {
  const config: PomodoroConfig = {
    focusDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 2,
    autoStartBreak: false,
    autoStartFocus: false,
    soundEnabled: false,
    soundType: "chime",
    soundVolume: 0.7,
    notificationEnabled: true,
    dailyGoalPomodoros: 8,
  };
  const onSaveConfig = vi.fn().mockResolvedValue(undefined);
  render(
    <PomodoroSettingsDialog
      isOpen
      onClose={vi.fn()}
      config={config}
      onSaveConfig={onSaveConfig}
    />,
  );

  fireEvent.change(screen.getByDisplayValue("2"), { target: { value: "1" } });
  fireEvent.submit(document.querySelector("form")!);

  await waitFor(() =>
    expect(onSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ longBreakInterval: 2 }),
    ),
  );
});

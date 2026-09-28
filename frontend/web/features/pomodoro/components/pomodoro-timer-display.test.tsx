// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PomodoroTimerDisplay } from "./pomodoro-timer-display";

afterEach(cleanup);

it("keeps the active task visible next to the running timer", () => {
  render(
    <PomodoroTimerDisplay
      mode="FOCUS"
      status="RUNNING"
      timeLeft={24 * 60 + 32}
      totalDuration={25 * 60}
      cycleCount={0}
      longBreakInterval={4}
      activeTaskTitle="đi chơi"
      onSwitchMode={vi.fn()}
    />,
  );

  expect(screen.getByText("Đang tập trung vào:")).toBeTruthy();
  expect(screen.getByText("đi chơi")).toBeTruthy();
});

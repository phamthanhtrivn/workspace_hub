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

  expect(screen.getByText("đi chơi")).toBeTruthy();
});

it("renders active task title and cleaned note inside the timer circle", () => {
  render(
    <PomodoroTimerDisplay
      mode="SHORT_BREAK"
      status="IDLE"
      timeLeft={5 * 60}
      totalDuration={5 * 60}
      cycleCount={1}
      longBreakInterval={4}
      activeTaskTitle="huhu"
      activeTaskNote={"[TASK]\nÔn tập chương 3 và làm bài tập"}
      onSwitchMode={vi.fn()}
    />,
  );

  expect(screen.getByText("huhu")).toBeTruthy();
  expect(
    screen.getAllByText("Ôn tập chương 3 và làm bài tập").length,
  ).toBeGreaterThan(0);
  expect(screen.queryByText(/\[TASK\]/)).toBeNull();
});

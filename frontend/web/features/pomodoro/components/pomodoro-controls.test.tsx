// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PomodoroControls } from "./pomodoro-controls";

afterEach(cleanup);

it.each([
  ["FOCUS", "BẮT ĐẦU FOCUS"],
  ["SHORT_BREAK", "BẮT ĐẦU NGHỈ NGẮN"],
  ["LONG_BREAK", "BẮT ĐẦU NGHỈ DÀI"],
] as const)("labels the idle action for %s mode", (mode, label) => {
  render(
    <PomodoroControls
      disabled={false}
      status="IDLE"
      mode={mode}
      onStart={vi.fn()}
      onPause={vi.fn()}
      onResume={vi.fn()}
      onReset={vi.fn()}
      onSkip={vi.fn()}
    />,
  );

  expect(screen.getByRole("button", { name: label })).toBeTruthy();
});

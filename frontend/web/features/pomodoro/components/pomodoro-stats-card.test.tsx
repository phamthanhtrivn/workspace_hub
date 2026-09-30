// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PomodoroStatsOverview } from "./pomodoro-stats-card";
import { getDailyStats } from "../api/pomodoro-server.api";

vi.mock("../api/pomodoro-server.api", () => ({ getDailyStats: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const stats = { date: "2026-09-30", totalFocusMinutes: 50, completedPomodoros: 2, completedTasks: 1, dailyGoalPomodoros: 8, currentStreak: 3, interruptionCounts: {} };

it("updates the daily goal immediately when settings change", async () => {
  vi.mocked(getDailyStats).mockResolvedValue(stats);
  const { rerender } = render(<PomodoroStatsOverview lastUpdated={0} dailyGoalPomodoros={8} />);
  await screen.findByText("2 / 8 phiên");
  rerender(<PomodoroStatsOverview lastUpdated={0} dailyGoalPomodoros={4} />);
  expect(screen.getByText("2 / 4 phiên")).toBeTruthy();
  expect(screen.getByText("50%")).toBeTruthy();
});

it("shows an actionable error and recovers on retry", async () => {
  vi.mocked(getDailyStats).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(stats);
  render(<PomodoroStatsOverview lastUpdated={0} />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  await screen.findByText("2 / 8 phiên");
  expect(screen.queryByRole("alert")).toBeNull();
});

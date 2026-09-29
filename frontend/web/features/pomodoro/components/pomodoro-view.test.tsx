// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PomodoroView } from "./pomodoro-view";

vi.mock("../hooks/use-pomodoro-timer", () => ({
  usePomodoroTimer: () => ({
    isReady: true,
    loadError: null,
    sessionRevision: 0,
    mode: "FOCUS",
    status: "IDLE",
    timeLeft: 1500,
    totalDuration: 1500,
    cycleCount: 0,
    activeTask: null,
    config: { longBreakInterval: 4 },
    notes: "",
    ambientTrack: "none",
    ambientVolume: 0.5,
    autoPlayAmbient: false,
    isAmbientPlaying: false,
    customTracks: [],
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    skip: vi.fn(),
    switchMode: vi.fn(),
    setActiveTask: vi.fn(),
    setNotes: vi.fn(),
    updateConfig: vi.fn(),
    selectAmbientTrack: vi.fn(),
    toggleAmbientPlay: vi.fn(),
    changeAmbientVolume: vi.fn(),
    toggleAutoPlayAmbient: vi.fn(),
    uploadCustomTrack: vi.fn(),
    removeCustomTrack: vi.fn(),
  }),
}));

vi.mock("./pomodoro-timer-display", () => ({ PomodoroTimerDisplay: () => <div /> }));
vi.mock("../hooks/use-pomodoro-task-actions", () => ({
  usePomodoroTaskActions: () => ({ runTaskAction: vi.fn(), taskRevision: 0 }),
}));
vi.mock("./pomodoro-ambient-player", () => ({ PomodoroAmbientPlayer: () => <div /> }));
vi.mock("./pomodoro-active-task", () => ({ PomodoroActiveTaskCard: () => <div /> }));
vi.mock("./pomodoro-stats-card", () => ({ PomodoroStatsOverview: () => <div /> }));
vi.mock("./pomodoro-report", () => ({ PomodoroReport: () => <div /> }));
vi.mock("./pomodoro-settings-dialog", () => ({
  PomodoroSettingsDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Cài đặt Pomodoro" /> : null,
}));

afterEach(cleanup);

it("moves settings to the header and removes sound and fullscreen shortcuts", () => {
  render(<PomodoroView />);

  expect(screen.queryByTitle(/chuông thông báo/)).toBeNull();
  expect(screen.queryByTitle(/toàn màn hình/i)).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Mở cài đặt Pomodoro" }));

  expect(screen.getByRole("dialog", { name: "Cài đặt Pomodoro" })).toBeTruthy();
});

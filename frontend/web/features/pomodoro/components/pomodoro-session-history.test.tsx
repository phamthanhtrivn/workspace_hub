// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { getRecentSessions } from "../api/pomodoro-server.api";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { PomodoroSessionHistory } from "./pomodoro-session-history";

vi.mock("../api/pomodoro-server.api", () => ({ getRecentSessions: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

function session(id: string, changes: Partial<PomodoroSessionRecord> = {}): PomodoroSessionRecord {
  return {
    id, taskTitle: `Task ${id}`, projectName: "Workspace", sessionType: "FOCUS", status: "COMPLETED",
    startedAt: "2026-09-29T02:00:00Z", endedAt: "2026-09-29T02:25:00Z",
    durationMinutes: 25, actualSeconds: 1500, ...changes,
  };
}

it("opens the selected session and reads its complete multiline note as plain text", async () => {
  const notes = "Hoàn thành phần đầu\nCần kiểm tra <b>API</b>\n" + "Ghi chú dài. ".repeat(100);
  vi.mocked(getRecentSessions).mockResolvedValue([
    session("one", { notes }), session("two", { notes: "Ghi chú phiên khác" }),
  ]);
  render(<PomodoroSessionHistory lastUpdated={0} />);
  const summary = await screen.findByLabelText(/Xem chi tiết phiên Task one lúc/);
  const details = summary.closest("details")!;
  expect(details.open).toBe(false);
  expect(within(summary).getByText("Có ghi chú")).toBeTruthy();
  fireEvent.click(summary);
  expect(details.open).toBe(true);
  expect(details.querySelector("p")?.textContent).toBe(notes);
  expect(details.querySelector("b")).toBeNull();
  expect(within(details).getByText("25 phút 0 giây")).toBeTruthy();
  expect(screen.getByLabelText(/Xem chi tiết phiên Task two lúc/).closest("details")?.open).toBe(false);
  fireEvent.click(summary);
  expect(details.open).toBe(false);
});

it("handles absent notes and shows actual seconds for stopped and skipped sessions", async () => {
  vi.mocked(getRecentSessions).mockResolvedValue([
    session("stopped", { status: "STOPPED", actualSeconds: 83, durationMinutes: 1 }),
    session("skipped", { status: "SKIPPED", sessionType: "SHORT_BREAK", notes: "  \n ", actualSeconds: 0 }),
  ]);
  render(<PomodoroSessionHistory lastUpdated={0} />);
  const summary = await screen.findByLabelText(/Xem chi tiết phiên Task stopped lúc/);
  fireEvent.click(summary);
  const details = summary.closest("details")!;
  expect(within(details).getByText("Phiên này không có ghi chú.")).toBeTruthy();
  expect(within(details).getByText("1 phút 23 giây")).toBeTruthy();
  expect(screen.queryByText("Có ghi chú")).toBeNull();
  const skipped = screen.getByLabelText(/Xem chi tiết phiên Task skipped lúc/);
  fireEvent.click(skipped);
  expect(within(skipped.closest("details")!).getByText("Nghỉ ngắn")).toBeTruthy();
});

it("refreshes notes with session data without leaving stale details open", async () => {
  vi.mocked(getRecentSessions).mockResolvedValue([session("one", { notes: "Ghi chú cũ" })]);
  const { rerender } = render(<PomodoroSessionHistory lastUpdated={0} />);
  const summary = await screen.findByLabelText(/Xem chi tiết phiên Task one lúc/);
  fireEvent.click(summary);
  vi.mocked(getRecentSessions).mockResolvedValue([session("one", { notes: "Ghi chú mới" })]);
  rerender(<PomodoroSessionHistory lastUpdated={1} />);
  await waitFor(() => expect(screen.getByText("Ghi chú mới")).toBeTruthy());
  expect(screen.queryByText("Ghi chú cũ")).toBeNull();
  expect(summary.closest("details")?.open).toBe(true);
});

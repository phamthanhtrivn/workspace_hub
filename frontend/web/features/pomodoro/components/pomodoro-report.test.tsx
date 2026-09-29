// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { getPomodoroReportSessions } from "../api/pomodoro-report.api";
import { getRecentSessions } from "../api/pomodoro-server.api";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { PomodoroReport } from "./pomodoro-report";
import { presetReportRange } from "../utils/pomodoro-report";

vi.mock("../api/pomodoro-report.api", () => ({ getPomodoroReportSessions: vi.fn() }));
vi.mock("../api/pomodoro-server.api", () => ({ getRecentSessions: vi.fn() }));
vi.mock("@/store/store", () => ({ useAppSelector: () => "user-1" }));
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function session(id: string, projectId = "p1"): PomodoroSessionRecord {
  return {
    id, taskId: id, taskTitle: `Task ${id}`, projectId, projectName: projectId === "p1" ? "Alpha" : "Beta",
    sessionType: "FOCUS", status: "COMPLETED", startedAt: new Date().toISOString(), endedAt: new Date().toISOString(),
    actualSeconds: 1500, durationMinutes: 25, notes: "Session note",
  };
}

function renderReport() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PomodoroReport lastUpdated={0} /></QueryClientProvider>);
}

it("filters both displayed history and summary by project and task", async () => {
  vi.mocked(getPomodoroReportSessions).mockResolvedValue([session("one"), session("two", "p2")]);
  renderReport();
  await screen.findByLabelText(/Xem chi tiết phiên Task one lúc/);
  fireEvent.change(screen.getByLabelText("Dự án"), { target: { value: "p2" } });
  expect(screen.queryByLabelText(/Xem chi tiết phiên Task one lúc/)).toBeNull();
  expect(screen.getByLabelText(/Xem chi tiết phiên Task two lúc/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Task"), { target: { value: "task:two" } });
  expect(screen.getByText("Tổng số phiên").nextSibling?.textContent).toBe("1");
  expect(getRecentSessions).not.toHaveBeenCalled();
});

it("exports all matching sessions even when only one page of history is visible", async () => {
  vi.mocked(getPomodoroReportSessions).mockResolvedValue(Array.from({ length: 25 }, (_, index) => session(String(index))));
  const createObjectURL = vi.fn<(blob: Blob) => string>().mockReturnValue("blob:report");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  renderReport();
  await screen.findByText("Trang 1 / 2");
  expect(screen.getAllByLabelText(/Xem chi tiết phiên/)).toHaveLength(20);
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  expect(screen.getAllByLabelText(/Xem chi tiết phiên/)).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "Xuất JSON" }));
  const blob = createObjectURL.mock.calls[0][0] as Blob;
  const reader = new FileReader();
  const exported = await new Promise<string>((resolve) => { reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob); });
  expect(JSON.parse(exported).sessions).toHaveLength(25);
  expect(JSON.parse(exported).summary.totalSessions).toBe(25);
  await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:report"), { timeout: 2000 });
});

it("changes presets and blocks invalid date ranges and exports", async () => {
  vi.mocked(getPomodoroReportSessions).mockResolvedValue([]);
  renderReport();
  await screen.findByText("Không có phiên nào phù hợp với khoảng ngày và bộ lọc đã chọn.");
  fireEvent.click(screen.getByRole("button", { name: "Tháng này" }));
  await waitFor(() => expect(getPomodoroReportSessions).toHaveBeenLastCalledWith(presetReportRange("month"), expect.any(AbortSignal)));
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2020-01-01" } });
  expect(screen.getByRole("alert").textContent).toContain("93 ngày");
  expect(screen.getByRole("button", { name: "Xuất JSON" })).toHaveProperty("disabled", true);
});

it("shows a retryable error and does not offer an export after load failure", async () => {
  vi.mocked(getPomodoroReportSessions).mockRejectedValueOnce(new Error("Offline")).mockResolvedValue([]);
  renderReport();
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Xuất JSON" })).toHaveProperty("disabled", true);
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  await screen.findByText("Không có phiên nào phù hợp với khoảng ngày và bộ lọc đã chọn.");
});

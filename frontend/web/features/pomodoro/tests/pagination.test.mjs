import assert from "node:assert/strict";
import test from "node:test";
import { POMODORO_REPORT_PAGE_SIZE } from "../constants/pomodoro-report.ts";
import { getPomodoroPagination } from "../utils/pomodoro-pagination.ts";
import { buildPomodoroReport, createReportExport } from "../utils/pomodoro-report.ts";

for (const [count, expectedPages] of [[0, 1], [1, 1], [15, 1], [16, 2], [30, 2], [31, 3]]) {
  test(`${count} records use ${expectedPages} page(s) of 15`, () => {
    const records = Array.from({ length: count }, (_, index) => index);
    const displayed = [];
    for (let page = 1; page <= expectedPages; page += 1) {
      const pagination = getPomodoroPagination(count, page, POMODORO_REPORT_PAGE_SIZE);
      assert.equal(pagination.currentPage, page);
      assert.equal(pagination.totalPages, expectedPages);
      const visible = records.slice(pagination.startIndex, pagination.endIndex);
      assert.ok(visible.length <= 15);
      displayed.push(...visible);
    }
    assert.deepEqual(displayed, records, "every record appears once in its original order");
    assert.equal(expectedPages > 1, count > 15, "navigation appears only above 15 records");
  });
}

test("clamps pages at both boundaries and keeps a partial last page", () => {
  assert.deepEqual(getPomodoroPagination(31, 99, 15), {
    currentPage: 3, totalPages: 3, startIndex: 30, endIndex: 31,
  });
  assert.deepEqual(getPomodoroPagination(16, 0, 15), {
    currentPage: 1, totalPages: 2, startIndex: 0, endIndex: 15,
  });
  assert.deepEqual(getPomodoroPagination(0, 3, 15), {
    currentPage: 1, totalPages: 1, startIndex: 0, endIndex: 0,
  });
});

test("a refreshed, shorter history has a nonempty valid last page", () => {
  const previous = getPomodoroPagination(31, 3, 15);
  const refreshed = getPomodoroPagination(16, previous.currentPage, 15);
  assert.equal(refreshed.currentPage, 2);
  assert.equal(refreshed.endIndex - refreshed.startIndex, 1);
  assert.equal(getPomodoroPagination(31, refreshed.currentPage, 15).currentPage, 2);
});

test("daily and session pagination are independent and do not mutate report or export", () => {
  const range = { startDate: "2026-10-01", endDate: "2026-10-31" };
  const filters = { project: "", task: "" };
  const sessions = Array.from({ length: 31 }, (_, index) => ({
    id: `session-${index}`,
    startedAt: new Date(2026, 9, 2, 9, index).toISOString(),
    endedAt: new Date(2026, 9, 2, 9, index + 1).toISOString(),
    sessionType: index % 4 === 0 ? "SHORT_BREAK" : "FOCUS",
    status: ["COMPLETED", "STOPPED", "SKIPPED"][index % 3],
    actualSeconds: 60,
    durationMinutes: 1,
    notes: `Session notes ${index}`,
  }));
  const report = buildPomodoroReport(sessions, range, filters);
  const before = structuredClone(report);
  const initialExport = createReportExport(report, range, filters);
  const daily = getPomodoroPagination(report.daily.length, 2, 15);
  const history = getPomodoroPagination(report.sessions.length, 1, 15);
  assert.equal(daily.currentPage, 2);
  assert.equal(history.currentPage, 1);
  assert.equal(report.daily.slice(daily.startIndex, daily.endIndex).length, 15);
  assert.equal(report.sessions.slice(history.startIndex, history.endIndex).length, 15);
  const lastHistory = getPomodoroPagination(report.sessions.length, 3, 15);
  assert.equal(report.sessions.slice(lastHistory.startIndex, lastHistory.endIndex).length, 1);
  assert.equal(daily.currentPage, 2);
  assert.deepEqual(report, before);
  const { exportedAt: initialTimestamp, ...initialPayload } = initialExport;
  const { exportedAt: finalTimestamp, ...finalPayload } = createReportExport(report, range, filters);
  assert.ok(initialTimestamp && finalTimestamp);
  assert.deepEqual(finalPayload, initialPayload);
  assert.equal(finalPayload.sessions.length, 31);
  assert.equal(finalPayload.daily.length, 31);
  assert.deepEqual(report.daily[0], {
    date: "2026-10-01", focusSeconds: 0, completedFocusSessions: 0, totalSessions: 0,
  }, "days without sessions remain in the report");
});

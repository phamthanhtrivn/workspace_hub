"use client";

import { useId, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePomodoroReport } from "../hooks/use-pomodoro-report";
import { PomodoroSessionHistory } from "./pomodoro-session-history";
import {
  buildPomodoroReport, createReportExport, formatFocusTime, presetReportRange, reportFilterOptions,
  type PomodoroReportFilters, type PomodoroReportPreset, type PomodoroReportRange,
} from "../utils/pomodoro-report";
import type { PomodoroSessionRecord } from "../types/pomodoro";

const EMPTY_SESSIONS: PomodoroSessionRecord[] = [];
const PAGE_SIZE = 20;
const INPUT_CLASS = "mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
const PRESETS: [PomodoroReportPreset, string][] = [["today", "Hôm nay"], ["week", "Tuần này"], ["month", "Tháng này"]];

export function PomodoroReport({ lastUpdated }: { lastUpdated: number }) {
  const id = useId();
  const [range, setRange] = useState(() => presetReportRange("week"));
  const [filters, setFilters] = useState<PomodoroReportFilters>({ project: "", task: "" });
  const [page, setPage] = useState(1);
  const query = usePomodoroReport(range, lastUpdated);
  const sessions = query.data ?? EMPTY_SESSIONS;
  const options = useMemo(() => reportFilterOptions(sessions, filters.project), [sessions, filters.project]);
  const report = useMemo(() => query.validationError ? null : buildPomodoroReport(sessions, range, filters),
    [sessions, range, filters, query.validationError]);
  const ready = !query.validationError && !query.isPending && !query.isError;
  const totalPages = Math.max(1, Math.ceil((report?.sessions.length ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const changeRange = (next: PomodoroReportRange) => {
    setRange(next);
    setFilters({ project: "", task: "" });
    setPage(1);
  };

  const exportReport = () => {
    if (!ready || query.isFetching || !report) return;
    try {
      const blob = new Blob([JSON.stringify(createReportExport(report, range, filters), null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pomodoro_${range.startDate}_${range.endDate}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Không xuất được báo cáo. Hãy thử lại.");
    }
  };

  return (
    <section className="space-y-4" aria-label="Lịch sử và báo cáo Pomodoro">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900">Lịch sử & báo cáo</h3>
          <Button type="button" variant="outline" size="sm" disabled={!ready || query.isFetching} onClick={exportReport}>
            <Download aria-hidden="true" className="mr-1.5 size-3.5" /> Xuất JSON
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Khoảng thời gian nhanh">
          {PRESETS.map(([preset, label]) => {
            const value = presetReportRange(preset);
            const selected = value.startDate === range.startDate && value.endDate === range.endDate;
            return <Button key={preset} type="button" size="sm" variant={selected ? "default" : "outline"} aria-pressed={selected} onClick={() => changeRange(value)}>{label}</Button>;
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label htmlFor={`${id}-start`} className="min-w-0 text-xs font-semibold text-slate-600">
            Từ ngày
            <input id={`${id}-start`} type="date" value={range.startDate} onChange={(event) => changeRange({ ...range, startDate: event.target.value })} className={INPUT_CLASS} />
          </label>
          <label htmlFor={`${id}-end`} className="min-w-0 text-xs font-semibold text-slate-600">
            Đến ngày
            <input id={`${id}-end`} type="date" value={range.endDate} onChange={(event) => changeRange({ ...range, endDate: event.target.value })} className={INPUT_CLASS} />
          </label>
          <label htmlFor={`${id}-project`} className="min-w-0 text-xs font-semibold text-slate-600">
            Dự án
            <select id={`${id}-project`} value={filters.project} disabled={!ready} className={INPUT_CLASS} onChange={(event) => { setFilters({ project: event.target.value, task: "" }); setPage(1); }}>
              <option value="">Tất cả dự án / cá nhân</option>
              {options.projects.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label htmlFor={`${id}-task`} className="min-w-0 text-xs font-semibold text-slate-600">
            Task
            <select id={`${id}-task`} value={filters.task} disabled={!ready} className={INPUT_CLASS} onChange={(event) => { setFilters({ ...filters, task: event.target.value }); setPage(1); }}>
              <option value="">Tất cả task</option>
              {options.tasks.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Tối đa 93 ngày. Phiên được tính theo ngày bắt đầu, theo giờ địa phương.</p>
        {query.validationError ? <p role="alert" className="mt-3 text-xs text-rose-600">{query.validationError}</p>
          : query.isError ? <div role="alert" className="mt-3 text-xs text-rose-600">Không tải được báo cáo. <button type="button" className="underline" onClick={() => void query.refetch()}>Thử lại</button></div>
          : query.isPending ? <p role="status" className="mt-3 text-xs text-slate-500">Đang tải lịch sử...</p> : null}
        {ready && report && (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Thời gian Focus", formatFocusTime(report.summary.focusSeconds)],
                ["Focus hoàn thành", report.summary.completedFocusSessions],
                ["Focus dừng sớm", report.summary.stoppedFocusSessions],
                ["Tổng số phiên", report.summary.totalSessions],
              ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-bold text-slate-900">{value}</dd></div>)}
            </dl>
            <details className="mt-4" open>
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">Thống kê theo ngày</summary>
              <div className="mt-2 max-h-56 overflow-auto">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">Thời gian tập trung và phiên hoàn thành theo ngày</caption>
                  <thead className="sticky top-0 bg-white text-slate-500"><tr><th scope="col" className="py-2">Ngày</th><th scope="col">Focus</th><th scope="col" className="text-right">Hoàn thành</th></tr></thead>
                  <tbody>{report.daily.map((day) => <tr key={day.date} className="border-t border-slate-100 text-slate-600"><th scope="row" className="py-2 font-normal">{day.date.split("-").reverse().join("/")}</th><td>{formatFocusTime(day.focusSeconds)}</td><td className="text-right">{day.completedFocusSessions}</td></tr>)}</tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>
      {ready && report && (
        <>
          <PomodoroSessionHistory
            records={report.sessions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)}
            title="Nhật ký phiên" totalCount={report.sessions.length} showDates
          />
          {totalPages > 1 && <nav aria-label="Phân trang lịch sử" className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Trang trước</Button>
            <span>Trang {currentPage} / {totalPages}</span>
            <Button type="button" variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Trang sau</Button>
          </nav>}
        </>
      )}
    </section>
  );
}

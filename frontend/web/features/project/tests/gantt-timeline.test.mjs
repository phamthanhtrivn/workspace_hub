import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const requirePackage = createRequire(import.meta.url);
const webRoot = path.resolve(import.meta.dirname, "../../..");
function featureLoader(overrides = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.isAbsolute(filename) ? filename : path.join(webRoot, filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} };
    cache.set(filename, compiledModule);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    }).outputText;
    const localRequire = (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return requirePackage(specifier);
      const base = specifier.startsWith("@/") ? path.join(webRoot, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
      const resolved = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (!resolved) throw new Error(`Cannot resolve ${specifier}`);
      return load(resolved);
    };
    new Function("require", "module", "exports", compiled)(localRequire, compiledModule, compiledModule.exports);
    return compiledModule.exports;
  }
  return load;
}

const load = featureLoader();
const { toLocalDate, dateKey, addDays, getGanttRange, getGanttDatePosition, getGanttBarGeometry, getGanttHitArea, getGanttScrollLeft, navigateGanttAnchor } = load("features/project/utils/gantt-timeline.utils.ts");
const { getGanttBarColor, useGanttTimeline } = load("features/project/hooks/use-gantt-timeline.ts");
const GanttTaskRow = load("features/project/components/gantt/gantt-task-row.tsx").default;
const GanttToolbar = load("features/project/components/gantt/gantt-toolbar.tsx").default;
const { TooltipProvider } = load("components/ui/tooltip.tsx");
const task = (id, startDate, dueDate = startDate) => ({
  id, projectId: "project", title: `Task ${id}`, taskNumber: 1, startDate, dueDate,
  status: "TODO", priority: "MEDIUM", archived: false, allDay: true, assignees: [],
});
const scaleFor = (zoomMode, anchor = "2026-10-22") => ({ zoomMode, range: getGanttRange(toLocalDate(anchor), zoomMode), dayWidth: 72, monthWidth: 90 });

test("tasks completely outside every zoom range have no fake bar", () => {
  for (const zoom of ["day", "week", "month"]) {
    const scale = scaleFor(zoom);
    const before = addDays(scale.range.start, -1);
    const after = addDays(scale.range.end, 1);
    for (const [date, expected] of [[before, "before"], [after, "after"]]) {
      const bar = getGanttBarGeometry(date, date, scale);
      assert.equal(bar.placement, expected);
      assert.equal(bar.width, 0);
    }
  }
});

test("tasks crossing either range boundary are clipped without changing full duration", () => {
  for (const zoom of ["day", "week", "month"]) {
    const scale = scaleFor(zoom);
    const bar = getGanttBarGeometry(addDays(scale.range.start, -5), addDays(scale.range.end, 5), scale);
    assert.equal(bar.placement, "inside");
    assert.equal(bar.left, 0);
    assert.equal(bar.clippedStart, true);
    assert.equal(bar.clippedEnd, true);
    assert.equal(bar.width, getGanttDatePosition(addDays(scale.range.end, 1), scale));
  }
});

test("month bars use real month lengths, including leap days and year boundaries", () => {
  const scale = scaleFor("month", "2024-02-29");
  const day = toLocalDate("2024-02-29");
  const bar = getGanttBarGeometry(day, day, scale);
  assert.ok(Math.abs(bar.width - 90 / 29) < 1e-9);
  assert.ok(bar.width < 28);
  assert.ok(Math.abs(getGanttDatePosition(day, scale, 0.5) - (bar.left + bar.width / 2)) < 1e-9);
  assert.equal(getGanttDatePosition(toLocalDate("2025-01-01"), scale), 12 * 90);
  const crossYear = getGanttBarGeometry(toLocalDate("2023-12-30"), toLocalDate("2024-01-01"), scale);
  assert.equal(crossYear.clippedStart, true);
  assert.ok(Math.abs(crossYear.width - 90 / 31) < 1e-9);
});

test("small bars keep their true width while hit areas and scrolling respect viewport boundaries", () => {
  assert.deepEqual(getGanttHitArea(0, 3, 900, 44), { left: 0, width: 44 });
  assert.deepEqual(getGanttHitArea(897, 3, 900, 44), { left: 856, width: 44 });
  assert.equal(getGanttScrollLeft(500, 800, 280, 1200), 240);
  assert.equal(getGanttScrollLeft(0, 800, 280, 1200), 0);
  assert.equal(getGanttScrollLeft(1200, 800, 280, 1200), 680);
});

test("navigation uses full weeks and calendar years", () => {
  const leapDay = toLocalDate("2024-02-29");
  assert.equal(dateKey(navigateGanttAnchor(leapDay, "month", 1)), "2025-02-28");
  assert.equal(dateKey(navigateGanttAnchor(leapDay, "day", 1)), "2024-03-07");
  assert.equal(dateKey(navigateGanttAnchor(leapDay, "week", -1)), "2024-02-22");
});

test("Today reaches the current date for historical projects and task refresh preserves navigation", () => {
  const states = [];
  let cursor = 0;
  const statefulReact = { ...React,
    useMemo: (factory) => factory(),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    },
  };
  const runTimelineHook = featureLoader({ react: statefulReact })("features/project/hooks/use-gantt-timeline.ts").useGanttTimeline;
  const currentYear = new Date().getFullYear();
  let tasks = [task("old", `${currentYear - 5}-01-01`)];
  const render = () => { cursor = 0; return runTimelineHook({ tasks, containerWidth: 1320 }); };
  let view = render();
  assert.equal(view.hasToday, false);
  view.jumpToToday();
  view = render();
  assert.equal(view.hasToday, true);
  assert.equal(dateKey(view.anchorDate), dateKey(new Date()));
  const anchor = dateKey(view.anchorDate);
  tasks = [task("older", `${currentYear - 10}-01-01`)];
  view = render();
  assert.equal(dateKey(view.anchorDate), anchor);
  view.setZoomMode("month");
  view = render();
  assert.equal(view.range.start.getFullYear(), currentYear);
  assert.equal(dateKey(view.anchorDate), anchor);
  view.jumpToTask(tasks[0]);
  view = render();
  assert.equal(view.range.start.getFullYear(), currentYear - 10);
  assert.equal(view.datedTasks[0].placement, "inside");
});

test("rows retain outside tasks and expose text details; toolbar announces the selected zoom", () => {
  let timeline;
  function Capture() {
    timeline = useGanttTimeline({ tasks: [task("old", "2000-01-01"), task("recent", dateKey(new Date()))], containerWidth: 1320 });
    return null;
  }
  renderToStaticMarkup(React.createElement(Capture));
  const old = timeline.datedTasks.find((item) => item.task.id === "old");
  const html = renderToStaticMarkup(React.createElement(TooltipProvider, null,
    React.createElement(GanttTaskRow, { item: old, labelWidth: 280, timelineWidth: timeline.timelineWidth, gridWidth: 72, highlights: [], minimumHitWidth: 44, getBarColor: getGanttBarColor, onJumpToTask() {}, onTaskClick() {} }),
  ));
  assert.ok(html.includes("Before this range"));
  assert.ok(html.includes("Jump to Task old"));
  assert.ok(html.includes("To Do"));
  assert.ok(!html.includes("translate-y-1/2"));
  const toolbar = renderToStaticMarkup(React.createElement(GanttToolbar, { rangeFormatted: "Range", currentMonthFormatted: "Oct 2026", taskCount: 2, zoomMode: "week", onZoomChange() {}, onNavigate() {}, onToday() {} }));
  assert.equal((toolbar.match(/aria-pressed="true"/g) || []).length, 1);
  assert.ok(toolbar.includes('aria-label="Previous period"'));
  assert.ok(toolbar.includes('aria-label="Next period"'));
});

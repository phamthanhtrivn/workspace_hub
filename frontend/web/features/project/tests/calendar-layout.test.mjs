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
const cache = new Map();
function load(relative) {
  const filename = path.isAbsolute(relative) ? relative : path.join(webRoot, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiledModule = { exports: {} };
  cache.set(filename, compiledModule);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const localRequire = (specifier) => {
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return requirePackage(specifier);
    const base = specifier.startsWith("@/") ? path.join(webRoot, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
    const resolved = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!resolved) throw new Error(`Cannot resolve ${specifier}`);
    return load(resolved);
  };
  new Function("require", "module", "exports", source)(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const { getCalendarWeekLayout, buildWeekTaskSegments, formatCalendarTaskRange } = load("features/project/utils/calendar-layout.utils.ts");
const { PROJECT_CALENDAR_LAYOUT } = load("features/project/constants/calendar-view.constants.ts");
const ProjectCalendarWeek = load("features/project/components/calendar/project-calendar-week.tsx").default;

function makeTask(id, startDate = "2026-10-19", dueDate = startDate) {
  return { id, title: `Task ${id}`, startDate, dueDate, allDay: true, status: "TODO", archived: false };
}

function makeWeek(tasks, firstDay = 19) {
  return Array.from({ length: 7 }, (_, column) => {
    const date = new Date(2026, 9, firstDay + column);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const isCurrentMonth = date.getMonth() === 9;
    return {
      key, date, isCurrentMonth, isToday: false,
      tasks: isCurrentMonth ? tasks.filter((task) => task.startDate <= key && task.dueDate >= key) : [],
    };
  });
}

test("empty, sparse and crowded days expose the correct hidden task count", () => {
  for (const count of [0, 1, 4, 20]) {
    const week = makeWeek(Array.from({ length: count }, (_, index) => makeTask(String(index))));
    for (const limit of [2, 3]) {
      const layout = getCalendarWeekLayout(week, limit);
      assert.equal(layout.visibleSegments.length, Math.min(count, limit));
      assert.deepEqual(layout.hiddenTaskCounts, [Math.max(0, count - limit), 0, 0, 0, 0, 0, 0]);
    }
  }
});

test("counts hidden spanning tasks even when a later day has fewer tasks than the lane limit", () => {
  const blockers = ["a", "b", "c"].map((id) => makeTask(id, "2026-10-19", "2026-10-20"));
  const hidden = makeTask("hidden", "2026-10-20", "2026-10-21");
  const week = makeWeek([...blockers, hidden]);
  const layout = getCalendarWeekLayout(week, 3);
  assert.deepEqual(layout.hiddenTaskCounts, [0, 1, 1, 0, 0, 0, 0]);
  assert.equal(week[2].tasks.length, 1);
  week[2].tasks.push(hidden);
  assert.equal(getCalendarWeekLayout(week, 3).hiddenTaskCounts[2], 1);
});

test("multi-day tasks remain one continuous segment in each week and respect blank month cells", () => {
  const spanning = makeTask("span", "2026-10-18", "2026-10-30");
  const first = buildWeekTaskSegments(makeWeek([spanning]));
  assert.equal(first.length, 1);
  assert.equal(first[0].startColumn, 0);
  assert.equal(first[0].span, 7);
  assert.equal(first[0].showTitle, true);
  const partialWeek = makeWeek([spanning]);
  partialWeek[0] = { ...partialWeek[0], isCurrentMonth: false, tasks: [] };
  const partial = buildWeekTaskSegments(partialWeek);
  assert.equal(partial[0].startColumn, 1);
  assert.equal(partial[0].span, 6);
  assert.equal(partial[0].showTitle, true);
  assert.equal(buildWeekTaskSegments(makeWeek([spanning], 26))[0].span, 5);
});

test("desktop and compact weeks reserve room for every visible row and the more button", () => {
  const tasks = Array.from({ length: 20 }, (_, index) => makeTask(String(index)));
  for (const compact of [false, true]) {
    const layout = compact ? PROJECT_CALENDAR_LAYOUT.compact : PROJECT_CALENDAR_LAYOUT.desktop;
    const html = renderToStaticMarkup(React.createElement(ProjectCalendarWeek, {
      days: makeWeek(tasks), compact, formatTime: () => "", onTaskClick() {}, onCreateDate() {},
    }));
    const areaHeight = layout.visibleLanes * layout.rowHeight + (layout.visibleLanes - 1) * PROJECT_CALENDAR_LAYOUT.rowGap;
    assert.ok(html.includes(`--calendar-task-area:${areaHeight}px`));
    assert.ok(html.includes(`--calendar-day-footer:${layout.footerHeight}px`));
    assert.ok(html.includes(`+${20 - layout.visibleLanes} more`));
    assert.equal((html.match(/title="Task /g) || []).length, layout.visibleLanes);
    if (compact) assert.ok(layout.rowHeight >= 44);
  }
});

test("day details include both dates for spanning tasks", () => {
  const label = formatCalendarTaskRange(makeTask("span", "2026-10-19", "2026-10-21"));
  assert.ok(label.includes("19"));
  assert.ok(label.includes("21"));
  assert.ok(label.includes("2026"));
  assert.ok(label.includes("–"));
});

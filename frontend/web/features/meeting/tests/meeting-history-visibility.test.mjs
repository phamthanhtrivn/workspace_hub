import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import React from "react";
import ts from "typescript";

const requirePackage = createRequire(import.meta.url);
const webRoot = path.resolve(import.meta.dirname, "../../..");
function load(relative, mocks = {}, cache = new Map()) {
  const filename = path.isAbsolute(relative) ? relative : path.join(webRoot, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = { exports: {} };
  cache.set(filename, compiled);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const localRequire = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return requirePackage(specifier);
    const base = specifier.startsWith("@/") ? path.join(webRoot, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
    const resolved = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    assert.ok(resolved, `Cannot resolve ${specifier}`);
    return load(resolved, {}, cache);
  };
  new Function("require", "module", "exports", source)(localRequire, compiled, compiled.exports);
  return compiled.exports;
}

function elements(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}
const Marker = () => null;

test("hide offers Undo, restore uses the same meeting and both refresh history queries", async () => {
  const requests = [];
  const notifications = [];
  const invalidations = [];
  const update = async (meetingId, hidden) => { requests.push({ meetingId, hidden }); return { data: { meetingId, hidden } }; };
  const { useMeetingHistoryVisibility } = load("features/meeting/hooks/useMeetingHistoryVisibility.ts", {
    "../api/meeting.api": { updateMeetingHistoryVisibility: update },
    "@tanstack/react-query": {
      useQueryClient: () => ({ invalidateQueries: async (query) => invalidations.push(query) }),
      useMutation: (options) => ({ isPending: false, mutateAsync: async (variables) => {
        const result = await options.mutationFn(variables);
        await options.onSuccess(result, variables);
        return result;
      } }),
    },
    sonner: { toast: { success: (...args) => notifications.push(args), error: () => assert.fail("Unexpected failure") } },
  });
  const visibility = useMeetingHistoryVisibility();
  await visibility.setVisibility("meeting", true);
  assert.deepEqual(requests, [{ meetingId: "meeting", hidden: true }]);
  assert.equal(notifications[0][1].action.label, "Undo");
  notifications[0][1].action.onClick();
  await new Promise(setImmediate);
  assert.deepEqual(requests[1], { meetingId: "meeting", hidden: false });
  assert.equal(invalidations.length, 2);
  assert.ok(invalidations.every((query) => query.queryKey[0] === "meeting-history"));
  assert.equal(notifications[1][0], "Meeting restored to your history");
});

test("failed persistence shows an error without reporting a successful hide", async () => {
  let successes = 0;
  let failures = 0;
  const { useMeetingHistoryVisibility } = load("features/meeting/hooks/useMeetingHistoryVisibility.ts", {
    "../api/meeting.api": { updateMeetingHistoryVisibility: async () => { throw new Error("Forbidden"); } },
    "@tanstack/react-query": {
      useQueryClient: () => ({ invalidateQueries: () => assert.fail("No successful change to refresh") }),
      useMutation: (options) => ({ isPending: false, mutateAsync: options.mutationFn }),
    },
    sonner: { toast: { success: () => successes++, error: () => failures++ } },
  });
  await useMeetingHistoryVisibility().setVisibility("meeting", true);
  assert.equal(successes, 0);
  assert.equal(failures, 1);
});

test("visible and hidden history use separate query caches and API filters", async () => {
  const requests = [];
  const { useMeetingHistory } = load("features/meeting/hooks/useMeetingHistory.ts", {
    "@tanstack/react-query": { useQuery: (options) => options },
    "../api/meeting.api": { getMeetingHistory: async (query) => requests.push(query) },
  });
  const visible = useMeetingHistory({ page: 2, enabled: true });
  const hidden = useMeetingHistory({ page: 2, enabled: true, visibility: "hidden" });
  assert.notDeepEqual(visible.queryKey, hidden.queryKey);
  await visible.queryFn();
  await hidden.queryFn();
  assert.equal(requests[0].visibility, "visible");
  assert.equal(requests[1].visibility, "hidden");
});

test("only terminal meetings expose Hide; hidden entries expose Restore", () => {
  const calls = [];
  const Item = () => null;
  const { MeetingHistoryActions } = load("features/meeting/components/history/meeting-history-actions.tsx", {
    "@/components/ui/dropdown-menu": {
      DropdownMenu: Marker, DropdownMenuTrigger: Marker, DropdownMenuContent: Marker, DropdownMenuItem: Item,
    },
    "../ui/meeting-icon-button": { MeetingIconButton: Marker },
  });
  const props = { meeting: { id: "meeting" }, hidden: false, disabled: false, onChange: (...args) => calls.push(args) };
  for (const status of ["LIVE", "SCHEDULED"]) {
    assert.equal(MeetingHistoryActions({ ...props, meeting: { ...props.meeting, status } }), null);
  }
  for (const hidden of [false, true]) {
    const tree = MeetingHistoryActions({ ...props, hidden, meeting: { ...props.meeting, status: "ENDED" } });
    elements(tree).find((node) => node.type === Item).props.onClick();
    assert.deepEqual(calls.at(-1), ["meeting", !hidden]);
  }
  const tree = MeetingHistoryActions({ ...props, disabled: true, meeting: { ...props.meeting, status: "CANCELLED" } });
  assert.equal(elements(tree).find((node) => node.type === Item).props.disabled, true);
});

test("history switches scopes from page one and recovers when the last page becomes empty", () => {
  const slots = [];
  let cursor = 0;
  let lastQuery;
  const Pagination = () => null;
  const Card = () => null;
  const HistoryButton = () => null;
  const { MeetingPreviousView } = load("features/meeting/components/history/meeting-previous-view.tsx", {
    react: { ...React, useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => { slots[index] = next; }];
    } },
    "../../hooks/useMeetingHistory": { meetingHistoryPageSize: 12, useMeetingHistory: (query) => {
      lastQuery = query;
      return { data: { data: { items: query.page === 1 ? [{ id: "meeting", status: "ENDED" }] : [], total: 1, totalPages: 1 } } };
    } },
    "../../hooks/useMeetingHistoryVisibility": { useMeetingHistoryVisibility: () => ({ setVisibility: async () => {}, isPending: false }) },
    "../../hooks/useMeetingHistoryBulkVisibility": { useMeetingHistoryBulkVisibility: () => ({ updateBulk: async () => true, isPending: false }) },
    "./meeting-history-bulk-toolbar": { MeetingHistoryBulkToolbar: Marker },
    "./meeting-history-bulk-confirm-dialog": { MeetingHistoryBulkConfirmDialog: Marker },
    "./meeting-history-actions": { MeetingHistoryActions: Marker },
    "./meeting-history-card": { MeetingHistoryCard: Card },
    "./meeting-history-list-row": { MeetingHistoryListRow: Marker },
    "../common/meeting-pagination": { MeetingPagination: Pagination },
    "../ui/meeting-empty-state": { MeetingEmptyState: Marker },
    "../ui/meeting-form-controls": { MeetingButton: HistoryButton },
    "../ui/meeting-icon-button": { MeetingIconButton: Marker },
    "../ui/meeting-loading-state": { MeetingLoadingState: Marker },
  });
  const render = () => { cursor = 0; return MeetingPreviousView(); };
  let tree = render();
  assert.ok(elements(tree).find((node) => node.type === Card).props.actions);
  elements(tree).find((node) => node.type === Pagination).props.onPageChange(2);
  render();
  render();
  assert.equal(lastQuery.page, 1);
  tree = render();
  elements(tree).find((node) => node.type === HistoryButton && node.props.children === "Hidden meetings").props.onClick();
  render();
  assert.equal(lastQuery.visibility, "hidden");
  assert.equal(lastQuery.page, 1);
});

function bulkHookFixture({ result = { hidden: true, affectedCount: 25, batchId: "original-batch" }, fail = false } = {}) {
  const updates = [];
  const undos = [];
  const notifications = [];
  let invalidations = 0;
  const { useMeetingHistoryBulkVisibility: runHook } = load("features/meeting/hooks/useMeetingHistoryBulkVisibility.ts", {
    "../api/meeting.api": {
      updateMeetingHistoryBulkVisibility: async (payload) => {
        updates.push(payload);
        if (fail) throw new Error("History changed");
        return { data: result };
      },
      undoMeetingHistoryBatch: async (batchId) => { undos.push(batchId); return { data: { hidden: false, affectedCount: 24, batchId: null } }; },
    },
    "@tanstack/react-query": {
      useQueryClient: () => ({ invalidateQueries: async () => invalidations++ }),
      useMutation: (options) => ({ isPending: false, mutateAsync: async (variables) => {
        try { return await options.mutationFn(variables); }
        finally { await options.onSettled(); }
      } }),
    },
    sonner: { toast: { success: (...args) => notifications.push({ kind: "success", args }), error: (...args) => notifications.push({ kind: "error", args }) } },
  });
  return { hook: runHook(), updates, undos, notifications, get invalidations() { return invalidations; } };
}

test("Hide all sends an all-pages scope and Undo uses the original batch token", async () => {
  const fixture = bulkHookFixture();
  const payload = { scope: "all", hidden: true, expectedCount: 25 };
  assert.equal(await fixture.hook.updateBulk(payload), true);
  assert.deepEqual(fixture.updates, [payload]);
  fixture.notifications[0].args[1].action.onClick();
  await new Promise(setImmediate);
  assert.deepEqual(fixture.undos, ["original-batch"]);
  assert.equal(fixture.updates.length, 1, "Undo must not call Restore all");
  assert.equal(fixture.invalidations, 2);
});

test("Restore all and no-op bulk responses do not offer an Undo hide action", async () => {
  for (const result of [
    { hidden: false, affectedCount: 25, batchId: null },
    { hidden: true, affectedCount: 0, batchId: null },
  ]) {
    const fixture = bulkHookFixture({ result });
    assert.equal(await fixture.hook.updateBulk({ scope: "all", hidden: result.hidden, expectedCount: result.affectedCount }), true);
    assert.equal(fixture.notifications[0].args[1].action, undefined);
  }
});

test("a stale or failed bulk request reports failure and refreshes the list", async () => {
  const fixture = bulkHookFixture({ fail: true });
  assert.equal(await fixture.hook.updateBulk({ scope: "all", hidden: true, expectedCount: 25 }), false);
  assert.equal(fixture.notifications[0].kind, "error");
  assert.equal(fixture.invalidations, 1);
});

test("bulk toolbar only selects the current page and exposes the full actionable count", () => {
  const Checkbox = () => null;
  const Button = () => null;
  const { MeetingHistoryBulkToolbar } = load("features/meeting/components/history/meeting-history-bulk-toolbar.tsx", {
    react: { ...React, useId: () => "select-page" },
    "@/components/ui/checkbox": { Checkbox },
    "../ui/meeting-form-controls": { MeetingButton: Button },
  });
  let checked;
  const tree = MeetingHistoryBulkToolbar({ hidden: false, selectedCount: 1, eligibleCount: 2, actionableTotal: 25, disabled: false,
    onSelectPage: (value) => { checked = value; }, onSelected: () => {}, onAll: () => {} });
  const checkbox = elements(tree).find((node) => node.type === Checkbox);
  assert.equal(checkbox.props.checked, "indeterminate");
  checkbox.props.onCheckedChange(true);
  assert.equal(checked, true);
  const buttons = elements(tree).filter((node) => node.type === Button);
  assert.deepEqual(buttons[1].props.children, ["Hide all", " (", 25, ")"]);
});

test("selected and all-page operations require confirmation and skip live meetings", async () => {
  const slots = [];
  let cursor = 0;
  const requests = [];
  const Toolbar = () => null;
  const Confirm = () => null;
  const Pagination = () => null;
  const Button = () => null;
  const Card = () => null;
  const { MeetingPreviousView } = load("features/meeting/components/history/meeting-previous-view.tsx", {
    react: { ...React, useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    } },
    "../../hooks/useMeetingHistory": { meetingHistoryPageSize: 12, useMeetingHistory: () => ({ data: { data: {
      items: [{ id: "ended", status: "ENDED" }, { id: "cancelled", status: "CANCELLED" }, { id: "live", status: "LIVE" }],
      total: 26, actionableTotal: 25, totalPages: 3,
    } } }) },
    "../../hooks/useMeetingHistoryVisibility": { useMeetingHistoryVisibility: () => ({ setVisibility: async () => {}, isPending: false }) },
    "../../hooks/useMeetingHistoryBulkVisibility": { useMeetingHistoryBulkVisibility: () => ({ updateBulk: async (payload) => { requests.push(payload); return true; }, isPending: false }) },
    "./meeting-history-bulk-toolbar": { MeetingHistoryBulkToolbar: Toolbar },
    "./meeting-history-bulk-confirm-dialog": { MeetingHistoryBulkConfirmDialog: Confirm },
    "./meeting-history-actions": { MeetingHistoryActions: Marker },
    "./meeting-history-card": { MeetingHistoryCard: Card },
    "./meeting-history-list-row": { MeetingHistoryListRow: Marker },
    "../common/meeting-pagination": { MeetingPagination: Pagination },
    "../ui/meeting-empty-state": { MeetingEmptyState: Marker },
    "../ui/meeting-form-controls": { MeetingButton: Button },
    "../ui/meeting-icon-button": { MeetingIconButton: Marker },
    "../ui/meeting-loading-state": { MeetingLoadingState: Marker },
  });
  const render = () => { cursor = 0; return MeetingPreviousView(); };
  let tree = render();
  const live = elements(tree).filter((node) => node.type === Card).find((node) => node.props.meeting.id === "live");
  assert.equal(live.props.selection.props.disabled, true);
  elements(tree).find((node) => node.type === Toolbar).props.onSelectPage(true);
  tree = render();
  assert.equal(elements(tree).find((node) => node.type === Toolbar).props.selectedCount, 2);
  elements(tree).find((node) => node.type === Toolbar).props.onSelected();
  tree = render();
  const confirm = elements(tree).find((node) => node.type === Confirm);
  assert.deepEqual(confirm.props.request, { scope: "selected", hidden: true, meetingIds: ["ended", "cancelled"], expectedCount: 2 });
  assert.equal(requests.length, 0, "opening confirmation must not mutate history");
  await confirm.props.onConfirm();
  tree = render();
  assert.equal(elements(tree).find((node) => node.type === Confirm).props.request, null);
  elements(tree).find((node) => node.type === Toolbar).props.onAll();
  tree = render();
  assert.deepEqual(elements(tree).find((node) => node.type === Confirm).props.request, { scope: "all", hidden: true, expectedCount: 25 });
  elements(tree).find((node) => node.type === Confirm).props.onClose();
  tree = render();
  elements(tree).find((node) => node.type === Button && node.props.children === "Hidden meetings").props.onClick();
  tree = render();
  elements(tree).find((node) => node.type === Toolbar).props.onAll();
  tree = render();
  assert.equal(elements(tree).find((node) => node.type === Confirm).props.request.hidden, false);
});

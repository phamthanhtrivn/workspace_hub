const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createSourceLoader, repositoryRoot } = require('../../../tests/support/typescript.cjs');
const projectRoot = path.join(repositoryRoot, 'frontend/web');
const load = createSourceLoader(projectRoot);
const meeting = load("features/meeting/utils/meeting-navigation.ts");
const project = load("features/project/utils/project-navigation.ts");
const firstUser = "00000000-0000-4000-8000-000000000001";
const secondUser = "00000000-0000-4000-8000-000000000002";

test("all Meeting tabs round-trip and old tab bookmarks preserve notification targets", () => {
  for (const view of ["overview", "upcoming", "previous", "recordings"]) {
    const legacy = new URLSearchParams({
      tab: view.toUpperCase(),
      meeting: "join-token",
      external: "keep",
    });
    const canonical = meeting.canonicalizeMeetingQuery(legacy);
    assert.equal(meeting.parseMeetingView(canonical), view);
    assert.equal(canonical.get("view"), view === "overview" ? null : view);
    assert.equal(canonical.has("tab"), false);
    assert.equal(canonical.get("meeting"), "join-token");
    assert.equal(canonical.get("external"), "keep");
    assert.equal(
      meeting.meetingViewQuery(canonical, "recordings").has("meeting"),
      false,
    );
  }
  for (const invalid of ["unknown", "personal-room", "javascript:alert(1)"]) {
    assert.equal(
      meeting.parseMeetingView(new URLSearchParams({ view: invalid })),
      "overview",
    );
  }
});

test("Project tabs retain filters, clear both task link formats, and default to board", () => {
  for (const view of project.PROJECT_VIEWS) {
    const params = project.projectViewQuery(
      new URLSearchParams(
        "taskId=current&task=old&priority=HIGH&memberRole=admin&external=keep",
      ),
      view,
    );
    assert.equal(project.parseProjectView(params), view);
    assert.equal(params.get("priority"), "HIGH");
    assert.equal(params.get("memberRole"), "admin");
    assert.equal(params.get("external"), "keep");
    assert.equal(params.has("taskId") || params.has("task"), false);
    assert.equal(params.has("view"), view !== "board");
  }
});

test("Project URL filters validate enum/UUID values and round-trip Unicode and reserved characters", () => {
  const parsed = project.parseProjectTaskFilters(
    new URLSearchParams({
      search: "Kiểm thử + & # ?",
      status: "in_progress",
      priority: "urgent",
      assignees: `${firstUser},invalid,${secondUser},${firstUser}`,
      onlyMine: "true",
    }),
  );
  assert.equal(parsed.status, "IN_PROGRESS");
  assert.equal(parsed.priority, "URGENT");
  assert.deepEqual(parsed.assigneeIds, [firstUser, secondUser]);
  assert.equal(parsed.onlyMyIssues, true);
  const serialized = project.projectTaskFilterQuery(
    new URLSearchParams("view=calendar&taskId=keep"),
    parsed,
  );
  assert.deepEqual(project.parseProjectTaskFilters(serialized), parsed);
  assert.equal(serialized.get("taskId"), "keep");
  const invalid = project.parseProjectTaskFilters(
    new URLSearchParams(
      "status=invalid&priority=invalid&assignee=invalid&onlyMine=bad",
    ),
  );
  assert.equal(invalid.status, "");
  assert.equal(invalid.priority, "");
  assert.equal(invalid.quickAssignee, "");
  assert.equal(invalid.onlyMyIssues, false);
  assert.equal(
    project.parseProjectTaskFilters(
      new URLSearchParams({ search: "x".repeat(101) }),
    ).searchQuery.length,
    100,
  );
});

test("quick-assignee filters exclude avatar filters and reset removes only task filter keys", () => {
  const params = new URLSearchParams({
    view: "members",
    memberRole: "pending",
    assignee: "unassigned",
    assignees: firstUser,
    taskId: "keep",
  });
  const parsed = project.parseProjectTaskFilters(params);
  assert.equal(parsed.quickAssignee, "UNASSIGNED");
  assert.deepEqual(parsed.assigneeIds, []);
  const reset = project.projectTaskFilterQuery(
    params,
    project.parseProjectTaskFilters(new URLSearchParams()),
  );
  assert.equal(reset.get("view"), "members");
  assert.equal(reset.get("memberRole"), "pending");
  assert.equal(reset.get("taskId"), "keep");
  assert.equal(reset.has("assignee") || reset.has("assignees"), false);
});

test("canonical queries preserve legacy Settings and task links without adding modal URL state", () => {
  const params = project.canonicalizeProjectQuery(
    new URLSearchParams(
      "view=settings&taskId=task&status=bad&memberRole=bad&external=keep",
    ),
  );
  assert.equal(params.get("view"), "settings");
  assert.equal(params.get("taskId"), "task");
  assert.equal(params.get("external"), "keep");
  assert.equal(params.has("status") || params.has("memberRole"), false);
  assert.equal(
    project
      .canonicalizeProjectQuery(new URLSearchParams("view=unknown"))
      .has("view"),
    false,
  );
});

function browserFixture(href) {
  const previous = global.window;
  let entries = [new URL(href)],
    position = 0;
  const history = {
    pushState(_state, _unused, target) {
      entries = [
        ...entries.slice(0, position + 1),
        new URL(target, entries[position]),
      ];
      position++;
    },
    replaceState(_state, _unused, target) {
      entries[position] = new URL(target, entries[position]);
    },
    back() {
      position = Math.max(0, position - 1);
    },
    forward() {
      position = Math.min(entries.length - 1, position + 1);
    },
  };
  global.window = {
    get location() {
      return entries[position];
    },
    history,
  };
  const stubs = {
    react: {
      ...React,
      useCallback: (callback) => callback,
      useMemo: (calculate) => calculate(),
      useEffect: (effect) => effect(),
      useState: (initial) => [
        typeof initial === "function" ? initial() : initial,
        () => {},
      ],
    },
    "next/navigation": {
      useSearchParams: () => new URLSearchParams(window.location.search),
    },
    "./use-debounced-value": { useDebouncedValue: (value) => value },
  };
  return {
    load: (file) => load(file, stubs),
    history,
    count: () => entries.length,
    restore() {
      if (previous === undefined) delete global.window;
      else global.window = previous;
    },
  };
}

test("Meeting URL hooks track direct links and Back/Forward without stale local tab state", () => {
  const browser = browserFixture(
    "https://example.test/meetings?tab=previous#section",
  );
  try {
    const { useMeetingLocation } = browser.load(
      "features/meeting/hooks/use-meeting-location.ts",
    );
    assert.equal(useMeetingLocation().activeView, "previous");
    assert.equal(window.location.search, "?view=previous");
    useMeetingLocation().changeView("recordings");
    assert.equal(useMeetingLocation().activeView, "recordings");
    browser.history.back();
    assert.equal(useMeetingLocation().activeView, "previous");
    browser.history.forward();
    assert.equal(useMeetingLocation().activeView, "recordings");
    assert.equal(window.location.hash, "#section");
    assert.equal(browser.count(), 2);
  } finally {
    browser.restore();
  }
});

test("Project filter hooks merge rapid updates, reset, reload and restore with Back/Forward", () => {
  const browser = browserFixture(
    `https://example.test/projects/project?view=calendar&taskId=task&search=initial#anchor`,
  );
  try {
    const { useProjectTaskFilters } = browser.load(
      "features/project/hooks/use-project-task-filters.ts",
    );
    const render = () => useProjectTaskFilters([], []);
    const stale = render();
    stale.setSearchQuery("new");
    stale.setSearchQuery("new text");
    assert.equal(browser.count(), 1);
    stale.setStatus("IN_PROGRESS");
    stale.setPriority("HIGH");
    stale.toggleAssignee(firstUser);
    stale.toggleAssignee(secondUser);
    assert.deepEqual(render().taskQuery, {
      search: "new text",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeUserIds: `${firstUser},${secondUser}`,
    });
    stale.setOnlyMyIssues((value) => !value);
    stale.setOnlyMyIssues((value) => !value);
    assert.equal(render().onlyMyIssues, false);
    stale.setQuickAssignee("UNASSIGNED");
    assert.equal(render().taskQuery.unassigned, true);
    assert.deepEqual(render().assigneeIds, []);
    stale.clear();
    assert.equal(render().isActive, false);
    assert.equal(window.location.search, "?view=calendar&taskId=task");
    browser.history.back();
    assert.equal(render().quickAssignee, "UNASSIGNED");
    browser.history.forward();
    assert.equal(render().isActive, false);
    assert.equal(window.location.hash, "#anchor");
  } finally {
    browser.restore();
  }
});

test("Project tab and member-filter navigation keep task filters isolated and drop drawer targets", () => {
  const browser = browserFixture(
    `https://example.test/projects/project?view=list&status=DONE&taskId=task&task=old`,
  );
  try {
    const { useProjectLocation } = browser.load(
      "features/project/hooks/use-project-location.ts",
    );
    const { useProjectMemberFilters } = browser.load(
      "features/project/hooks/use-project-member-filters.ts",
    );
    useProjectLocation().changeView("members");
    assert.equal(window.location.search, "?view=members&status=DONE");
    useProjectMemberFilters().setSearchQuery("Thanh + Tri");
    useProjectMemberFilters().setRole("PENDING");
    assert.equal(useProjectMemberFilters().role, "PENDING");
    assert.equal(useProjectMemberFilters().searchQuery, "Thanh + Tri");
    useProjectLocation().changeView("board");
    assert.equal(useProjectLocation().view, "board");
    browser.history.back();
    assert.equal(useProjectLocation().view, "members");
    assert.equal(useProjectMemberFilters().role, "PENDING");
    assert.equal(
      new URLSearchParams(window.location.search).get("status"),
      "DONE",
    );
  } finally {
    browser.restore();
  }
});

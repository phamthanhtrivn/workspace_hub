import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  formatMessageScopeLabel,
  resolveWorkContext,
  WORK_CONTEXT_LABELS,
  WORK_MESSAGE_SCOPE_LABELS,
} from "../constants/work-assistant";
import type { TaskReference, WorkMessage } from "../types";
import WorkAssistantMessage from "./work-assistant-message";

const sources: TaskReference[] = [
  {
    id: "ggwp",
    kind: "project",
    projectId: "project",
    title: "GGWP",
    url: "/projects/project?taskId=ggwp",
    dueAt: null,
  },
  {
    id: "auth",
    kind: "project",
    projectId: "project",
    title: "Auth API",
    url: "/projects/project?taskId=auth",
    dueAt: null,
  },
];

function renderMessage(
  content: string,
  references = sources,
  role: WorkMessage["role"] = "assistant",
) {
  return renderToStaticMarkup(
    <WorkAssistantMessage
      message={{
        id: "message",
        role,
        content,
        sources: references,
        created_at: "2026-11-09T00:00:00Z",
      }}
    />,
  ).split("Referenced tasks")[0];
}

test("every task mention links in the opening sentence and numbered recommendations", () => {
  const html = renderMessage(
    "**Start with a quick check of [GGWP](/projects/project?taskId=ggwp), then focus on Auth API.**\n\n1. **GGWP — overdue.**\n2. **[Auth API](/projects/project?taskId=auth) — in progress.**\n\nRevisit Auth API after GGWP.",
  );
  assert.equal(
    (html.match(/href="\/projects\/project\?taskId=auth"/g) ?? []).length,
    3,
  );
  assert.equal(
    (html.match(/href="\/projects\/project\?taskId=ggwp"/g) ?? []).length,
    3,
  );
  assert.ok(html.includes("<ol>"));
  assert.ok(!/<a[^>]*>\d+\.?<\/a>/.test(html));
});

test("unknown task names and arbitrary URLs do not become navigation links", () => {
  const html = renderMessage(
    "Unknown task. [Auth API](https://example.com) [Outside](/projects/other?taskId=hidden)",
  );
  assert.ok(!html.includes("href="));
});

test("a user message does not gain inferred task links", () => {
  const html = renderMessage(
    "Please prioritize Auth API and GGWP.",
    sources,
    "user",
  );
  assert.ok(!html.includes("href="));
});

test("task names in code and existing link labels do not create nested links", () => {
  const html = renderMessage(
    "`Auth API`\n\n```text\nGGWP\n```\n\n[Auth API](/projects/project?taskId=auth)",
  );
  assert.equal((html.match(/href=/g) ?? []).length, 1);
  assert.ok(html.includes("<code>Auth API</code>"));
  assert.ok(!/<a[^>]*>[^<]*<a/.test(html));
});

test("ambiguous duplicate titles are not guessed, while explicit task links remain usable", () => {
  const duplicates = [
    sources[1],
    {
      ...sources[1],
      id: "other-auth",
      projectId: "other",
      url: "/projects/other?taskId=other-auth",
    },
  ];
  const html = renderMessage(
    "Auth API. [Auth API](/projects/project?taskId=auth)",
    duplicates,
  );
  assert.equal((html.match(/href=/g) ?? []).length, 1);
});

test("calendar tasks link to their event and date, and task text is never parsed as markup", () => {
  const calendar: TaskReference = {
    id: "event",
    kind: "calendar",
    title: "Design [v2]",
    url: "/calendar?eventId=event&t=1794268800000",
    dueAt: null,
  };
  const html = renderMessage("Keep Design \\[v2\\] in view.", [calendar]);
  assert.match(html, /href="\/calendar\?eventId=event&amp;t=1794268800000"/);
  assert.ok(html.includes(">Design [v2]</a>"));
});

test("task names match as complete phrases, including repeated mentions with different casing", () => {
  const html = renderMessage(
    "XAuth API and Auth APIv2 are unrelated. Start auth api, then revisit AUTH API.",
  );
  assert.equal((html.match(/href=/g) ?? []).length, 2);
  assert.ok(html.includes(">auth api</a>"));
  assert.ok(html.includes(">AUTH API</a>"));
});

test("longer task names, Unicode titles and regular-expression characters keep the correct destinations", () => {
  const references = [
    ...sources,
    { ...sources[1], id: "short", title: "Auth" },
    { ...sources[0], id: "unicode", title: "Kiểm tra C++ (v2)" },
  ];
  const html = renderMessage(
    "Auth API, Auth, and **Kiểm tra C++ (v2)**.",
    references,
  );
  assert.equal((html.match(/href=/g) ?? []).length, 3);
  assert.match(html, /href="\/projects\/project\?taskId=auth">Auth API<\/a>/);
  assert.match(html, /href="\/projects\/project\?taskId=short">Auth<\/a>/);
  assert.match(
    html,
    /href="\/projects\/project\?taskId=unicode">Kiểm tra C\+\+ \(v2\)<\/a>/,
  );
});

test("resolveWorkContext maps dashboard, projects list, project detail, and calendar routes accurately", () => {
  assert.deepEqual(resolveWorkContext("/dashboard"), {
    audience: "mine",
    label: WORK_CONTEXT_LABELS.ALL_MY_TASKS,
  });
  assert.deepEqual(resolveWorkContext("/projects"), {
    audience: "projects",
    label: WORK_CONTEXT_LABELS.ALL_PROJECTS,
  });
  assert.deepEqual(
    resolveWorkContext("/projects/11111111-2222-3333-4444-555555555555"),
    {
      projectId: "11111111-2222-3333-4444-555555555555",
      audience: "mine",
      label: WORK_CONTEXT_LABELS.CURRENT_PROJECT,
    },
  );
  assert.deepEqual(resolveWorkContext("/calendar"), {
    audience: "calendar",
    label: WORK_CONTEXT_LABELS.CALENDAR,
  });
});

test("formatMessageScopeLabel returns concise labels for all assistant scopes", () => {
  assert.equal(
    formatMessageScopeLabel({ audience: "mine" }),
    WORK_MESSAGE_SCOPE_LABELS.ALL_MY_TASKS,
  );
  assert.equal(
    formatMessageScopeLabel({ audience: "projects" }),
    WORK_MESSAGE_SCOPE_LABELS.ALL_PROJECTS,
  );
  assert.equal(
    formatMessageScopeLabel({
      projectId: "11111111-2222-3333-4444-555555555555",
      audience: "mine",
    }),
    WORK_MESSAGE_SCOPE_LABELS.CURRENT_PROJECT,
  );
  assert.equal(
    formatMessageScopeLabel({ audience: "calendar" }),
    WORK_MESSAGE_SCOPE_LABELS.CALENDAR,
  );
});

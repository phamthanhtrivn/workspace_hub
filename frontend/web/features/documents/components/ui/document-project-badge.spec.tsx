import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { projectKeys } from "@/features/project/hooks/use-projects";
import { DocumentProjectBadge } from "./document-project-badge";

test("project badges use the current project name and configured color", (context) => {
  const client = new QueryClient();
  context.after(() => client.clear());
  const render = () =>
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <DocumentProjectBadge projectId="project" />
      </QueryClientProvider>,
    );
  client.setQueryData(projectKeys.detail("project"), {
    id: "project",
    name: "GatherTown",
    color: "#4f46e5",
  });
  const html = render();
  assert.match(html, /Project: GatherTown/);
  assert.match(html, /--project-color:#4f46e5/);
  client.setQueryData(projectKeys.detail("project"), {
    id: "project",
    name: "Renamed project",
    color: "#dc2626",
  });
  const updated = render();
  assert.match(updated, /Project: Renamed project/);
  assert.match(updated, /--project-color:#dc2626/);
  assert.doesNotMatch(updated, /GatherTown/);
});

test("project badges keep full long names available in their title", (context) => {
  const client = new QueryClient();
  context.after(() => client.clear());
  const name = "A long project name used to identify shared thesis documents";
  client.setQueryData(projectKeys.detail("project"), {
    id: "project",
    name,
    color: "#16a34a",
  });
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <DocumentProjectBadge projectId="project" />
    </QueryClientProvider>,
  );
  assert.ok(html.includes(`title="Project: ${name}"`));
});

test("missing project metadata keeps a source badge without displaying an internal ID", (context) => {
  const client = new QueryClient();
  context.after(() => client.clear());
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <DocumentProjectBadge projectId="private-project-id" />
    </QueryClientProvider>,
  );
  assert.match(html, /Project/);
  assert.doesNotMatch(html, /private-project-id|undefined/);
});

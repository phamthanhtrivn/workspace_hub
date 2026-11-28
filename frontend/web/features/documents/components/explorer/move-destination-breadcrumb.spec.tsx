import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MoveDestinationBreadcrumb } from "./move-destination-breadcrumb";
import { DocumentItemType, DocumentRole } from "../../types/documents.enums";
import type { DocumentDropDestination } from "../../types/document-bulk.types";
import { buildDocumentDropPath } from "../../utils/document-bulk";

const destination: DocumentDropDestination = {
  id: "halo",
  name: "Halo",
  type: DocumentItemType.FOLDER,
  projectId: null,
  parentFolderId: "parent",
  userRole: DocumentRole.OWNER,
  isArchived: false,
};

test("Move confirmation renders the full destination hierarchy as breadcrumbs", () => {
  const path = buildDocumentDropPath(destination, [
    { id: "parent", name: "Design" },
    { id: "halo", name: "Halo" },
  ]);
  const markup = renderToStaticMarkup(
    <MoveDestinationBreadcrumb destination={{ ...destination, path }} />,
  );
  assert.match(markup, /aria-label="Move destination"/);
  assert.ok(markup.indexOf("My files") < markup.indexOf("Design"));
  assert.ok(markup.indexOf("Design") < markup.indexOf("Halo"));
  assert.match(markup, /breadcrumb-separator/);
});

test("root, shared and project destinations retain their actual location labels", () => {
  assert.deepEqual(
    buildDocumentDropPath({ ...destination, id: null, name: "My files" }),
    [{ id: null, name: "My files" }],
  );
  assert.equal(
    buildDocumentDropPath({ ...destination, userRole: DocumentRole.EDITOR })[0]
      .name,
    "Shared",
  );
  assert.deepEqual(
    buildDocumentDropPath({ ...destination, projectId: "project" }, [
      { id: "project-root", name: "GatherTown" },
      { id: "halo", name: "Halo" },
    ]).map((folder) => folder.name),
    ["GatherTown", "Halo"],
  );
});

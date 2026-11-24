import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SharedDetails } from "@/app/(public)/documents/shared/[id]/components/shared-details";
import {
  DocumentItemType,
  DocumentRole,
  LinkAccess,
} from "@/features/documents/types/documents.enums";
import type { DocumentItem } from "@/features/documents/types/documents.types";

const document: DocumentItem = {
  id: "shared-document",
  name: "Report.md",
  type: DocumentItemType.FILE,
  ownerUserId: "owner",
  ownerEmail: "owner@example.com",
  parentFolderId: null,
  projectId: null,
  s3Key: "report",
  mimeType: "text/markdown",
  sizeBytes: 19,
  isStarred: false,
  isArchived: false,
  archivedAt: null,
  createdAt: "2026-11-24T00:00:00Z",
  updatedAt: "2026-11-24T00:00:00Z",
};

test("email-shared restricted documents retain Restricted separately from the recipient's role", () => {
  for (const role of [
    DocumentRole.VIEWER,
    DocumentRole.EDITOR,
    DocumentRole.OWNER,
  ]) {
    const markup = renderToStaticMarkup(
      <SharedDetails
        item={{ ...document, linkAccess: LinkAccess.NONE }}
        userRole={role}
      />,
    );
    assert.match(markup, />Restricted</);
    assert.doesNotMatch(markup, /Anyone with the link/);
    assert.match(markup, /lucide-lock/);
    assert.ok(markup.includes(role.charAt(0) + role.slice(1).toLowerCase()));
  }
});

test("public view links stay view-only even for a named Editor or Owner", () => {
  for (const linkAccess of [LinkAccess.VIEWER, LinkAccess.EDITOR]) {
    for (const role of [
      DocumentRole.VIEWER,
      DocumentRole.EDITOR,
      DocumentRole.OWNER,
    ]) {
      const markup = renderToStaticMarkup(
        <SharedDetails item={{ ...document, linkAccess }} userRole={role} />,
      );
      assert.match(markup, /Anyone with the link \(Viewer\)/);
      assert.doesNotMatch(markup, /Anyone with the link \(Edit/);
      assert.match(markup, /lucide-globe/);
    }
  }
});

test("missing link metadata does not claim that the document is public", () => {
  const markup = renderToStaticMarkup(
    <SharedDetails item={document} userRole={DocumentRole.VIEWER} />,
  );
  assert.match(markup, />Restricted</);
  assert.doesNotMatch(markup, /Anyone with the link/);
});

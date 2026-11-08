import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { SharedDenied } from "./shared-denied";
import type { SharedDocumentAccessCode } from "@/features/documents/types/shared-document-access.constants";

function render(reason: SharedDocumentAccessCode, isLoggedIn: boolean) {
  return renderToStaticMarkup(
    <PathnameContext.Provider value="/documents/shared/file">
      <SharedDenied reason={reason} isLoggedIn={isLoggedIn} />
    </PathnameContext.Provider>,
  );
}

test("signed-in users see a restricted explanation and owner guidance without another sign-in prompt", () => {
  const html = render("DOCUMENT_ACCESS_RESTRICTED", true);
  assert.match(html, /Access restricted/);
  assert.match(html, /owner/);
  assert.doesNotMatch(html, /href="\/login/);
  assert.doesNotMatch(html, /link has expired/);
});

test("guests can sign in with an account that already has access", () => {
  const html = render("DOCUMENT_ACCESS_RESTRICTED", false);
  assert.match(html, /Sign in/);
  assert.match(html, /returnTo=%2Fdocuments%2Fshared%2Ffile/);
});

test("expired and missing links have different explanations", () => {
  const expired = render("DOCUMENT_LINK_EXPIRED", true);
  assert.match(expired, /Link expired/);
  assert.match(expired, /renew/);
  assert.doesNotMatch(expired, /href="\/login/);
  const missing = render("DOCUMENT_NOT_FOUND", false);
  assert.match(missing, /Document not found/);
  assert.doesNotMatch(missing, /href="\/login/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LinkAccess } from "../../types/documents.enums";
import { ShareModalLink } from "./share-link";

test("only owners see Copy share link in the sharing dialog", () => {
  const client = new QueryClient();
  try {
    for (const isOwner of [true, false]) {
      const markup = renderToStaticMarkup(
        <QueryClientProvider client={client}>
          <ShareModalLink
            documentItemId="document"
            initialLinkAccess={LinkAccess.NONE}
            isOwner={isOwner}
          />
        </QueryClientProvider>,
      );
      assert.equal(markup.includes("Copy share link"), isOwner);
      assert.equal(markup.includes("Restricted"), true);
    }
  } finally {
    client.clear();
  }
});

import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { store } from "@/store/store";
import { Button } from "@/components/ui/button";
import { documentsApi } from "@/features/documents/api/documents.api";
import FilePreviewModal from "@/features/documents/components/preview/file-preview-modal";
import {
  DocumentItemType,
  DocumentRole,
} from "@/features/documents/types/documents.enums";
import type { ChatMetadataResponse } from "@/features/documents/types/documents.types";
import type { ChatMessageResponse } from "../../types/chat.types";
import { chatDocumentMetadataKey } from "../../types/document.constants";
import { DocumentMessage } from "./document-message";
import { DocumentAccessNotice } from "./document-access-notice";

const metadata: ChatMetadataResponse = {
  id: "shared-document",
  name: "report.pdf",
  type: DocumentItemType.FILE,
  sizeBytes: 128,
  mimeType: "application/pdf",
  ownerEmail: "owner@example.com",
  ownerName: "Owner",
  createdAt: "2026-11-08T00:00:00Z",
  hasPermission: true,
  userRole: DocumentRole.VIEWER,
  projectId: null,
};

function descendants(node: React.ReactNode): React.ReactElement[] {
  return React.Children.toArray(node).flatMap((child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return [];

    return [child, ...descendants(child.props.children)];
  });
}

function setup(context: TestContext, documentMetadata = metadata) {
  const client = new QueryClient();
  context.after(() => client.clear());
  const testStore = configureStore({
    reducer: () => ({
      ...store.getState(),
      auth: { ...store.getState().auth, userId: "viewer" },
    }),
  });
  const key = chatDocumentMetadataKey("viewer", metadata.id);
  client.setQueryData(key, documentMetadata);
  const metadataRequest = context.mock.method(
    documentsApi,
    "getChatMetadata",
    async () => documentMetadata,
  );
  const states: unknown[] = [];
  let stateIndex = 0;
  const useState = React.useState;
  context.mock.method(React, "useState", ((initial: unknown) => {
    if (typeof initial === "function") return useState(initial);
    const index = stateIndex++;
    if (!(index in states)) states[index] = initial;

    return [
      states[index],
      (next: unknown) => {
        states[index] = typeof next === "function" ? next(states[index]) : next;
      },
    ];
  }) as typeof React.useState);
  const open = context.mock.fn();
  const originalWindow = globalThis.window;
  globalThis.window = { open } as unknown as Window & typeof globalThis;
  context.after(() => {
    globalThis.window = originalWindow;
  });
  const previewRequest = context.mock.method(
    documentsApi,
    "getPreviewUrl",
    async () => "https://files.example.com/report.pdf",
  );
  const push = context.mock.fn();
  const router = {
    bfcacheId: "chat-preview-test",
    push,
    back() {},
    forward() {},
    refresh() {},
    replace() {},
    prefetch() {},
  };
  let tree: React.ReactNode;
  function Harness() {
    tree = DocumentMessage({
      msg: { content: metadata.id } as ChatMessageResponse,
      isMe: false,
    });

    return null;
  }
  function render(nextMetadata = documentMetadata) {
    stateIndex = 0;
    client.setQueryData(key, nextMetadata);
    renderToStaticMarkup(
      <Provider store={testStore}>
        <AppRouterContext.Provider value={router}>
          <QueryClientProvider client={client}>
            <Harness />
          </QueryClientProvider>
        </AppRouterContext.Provider>
      </Provider>,
    );

    return descendants(tree);
  }

  return { render, open, previewRequest, push, metadataRequest };
}

function button(elements: React.ReactElement[], label: string) {
  return elements.find(
    (element) =>
      element.type === Button &&
      descendants(element).some(
        (child) =>
          child.type === "span" &&
          (child.props as { children?: React.ReactNode }).children === label,
      ),
  ) as React.ReactElement<{ onClick: () => void | Promise<void> }> | undefined;
}

test("shared document Preview opens and closes the Documents modal without opening a tab", async (context) => {
  const harness = setup(context);
  const initial = harness.render();
  assert.equal(
    initial.some((element) => element.type === FilePreviewModal),
    false,
  );
  const preview = button(initial, "Preview");
  assert.ok(preview);
  await preview.props.onClick();
  assert.equal(harness.open.mock.callCount(), 0);
  assert.equal(
    harness.previewRequest.mock.callCount(),
    0,
    "the modal owns preview URL loading",
  );
  const modal = harness
    .render()
    .find((element) => element.type === FilePreviewModal) as
    | React.ReactElement<React.ComponentProps<typeof FilePreviewModal>>
    | undefined;
  assert.ok(modal);
  assert.equal(modal.props.open, true);
  assert.equal(modal.props.item?.id, metadata.id);
  assert.equal(modal.props.item?.mimeType, metadata.mimeType);
  assert.ok(modal.props.onDownload);
  modal.props.onClose();
  assert.equal(
    harness.render().some((element) => element.type === FilePreviewModal),
    false,
  );
});

test("revoking document access hides an already opened preview", async (context) => {
  const harness = setup(context);
  const preview = button(harness.render(), "Preview");
  assert.ok(preview);
  await preview.props.onClick();
  assert.ok(
    harness.render().some((element) => element.type === FilePreviewModal),
  );
  const elements = harness.render({ ...metadata, hasPermission: false });
  assert.equal(button(elements, "Preview"), undefined);
  assert.equal(
    elements.some((element) => element.type === FilePreviewModal),
    false,
  );
});

test("preview downloads only when its Download action is selected", async (context) => {
  const harness = setup(context);
  const download = context.mock.method(
    documentsApi,
    "getDownloadUrl",
    async () => "https://files.example.com/download/report.pdf",
  );
  const click = context.mock.fn();
  const link = { href: "", download: "", click };
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: () => link,
    body: { appendChild() {}, removeChild() {} },
  } as unknown as Document;
  context.after(() => {
    globalThis.document = originalDocument;
  });
  const preview = button(harness.render(), "Preview");
  assert.ok(preview);
  await preview.props.onClick();
  assert.equal(download.mock.callCount(), 0);
  assert.equal(click.mock.callCount(), 0);
  const modal = harness
    .render()
    .find((element) => element.type === FilePreviewModal) as
    | React.ReactElement<React.ComponentProps<typeof FilePreviewModal>>
    | undefined;
  assert.ok(modal?.props.onDownload);
  await modal.props.onDownload(metadata);
  assert.equal(download.mock.calls[0].arguments[0], metadata.id);
  assert.equal(link.download, metadata.name);
  assert.equal(click.mock.callCount(), 1);
});

test("shared documents without access expose neither Preview nor the preview modal", (context) => {
  const harness = setup(context, { ...metadata, hasPermission: false });
  const elements = harness.render();
  assert.equal(button(elements, "Preview"), undefined);
  assert.equal(
    elements.some((element) => element.type === FilePreviewModal),
    false,
  );
  assert.equal(harness.previewRequest.mock.callCount(), 0);
});

test("shared folders keep the Open Folder action instead of a preview modal", async (context) => {
  const harness = setup(context, {
    ...metadata,
    type: DocumentItemType.FOLDER,
  });
  const elements = harness.render();
  assert.equal(button(elements, "Preview"), undefined);
  const openFolder = button(elements, "Open Folder");
  assert.ok(openFolder);
  await openFolder.props.onClick();
  assert.equal(
    harness.push.mock.calls[0].arguments[0],
    `/documents?view=shared&folderId=${metadata.id}`,
  );
  assert.equal(
    elements.some((element) => element.type === FilePreviewModal),
    false,
  );
});

for (const role of [
  DocumentRole.OWNER,
  DocumentRole.EDITOR,
  DocumentRole.VIEWER,
]) {
  test(`folder navigation revalidates the current ${role} role instead of trusting the cached card`, async (context) => {
    const harness = setup(context, {
      ...metadata,
      type: DocumentItemType.FOLDER,
      projectId: "project",
    });
    harness.metadataRequest.mock.mockImplementation(async () => ({
      ...metadata,
      type: DocumentItemType.FOLDER,
      projectId: "project",
      userRole: role,
    }));
    const open = button(harness.render(), "Open Folder");
    assert.ok(open);
    await open.props.onClick();
    assert.equal(harness.metadataRequest.mock.callCount(), 1);
    assert.equal(
      harness.push.mock.calls[0].arguments[0],
      role === DocumentRole.OWNER
        ? `/documents?folderId=${metadata.id}`
        : `/documents?view=shared&folderId=${metadata.id}`,
    );
  });
}

for (const [code, status] of [
  ["DOCUMENT_ACCESS_RESTRICTED", 403],
  ["DOCUMENT_NOT_FOUND", 404],
] as const) {
  test(`${code} after loading a Chat card blocks navigation and reports on the card`, async (context) => {
    const harness = setup(context, {
      ...metadata,
      type: DocumentItemType.FOLDER,
    });
    const error = { isAxiosError: true, response: { status, data: { code } } };
    harness.metadataRequest.mock.mockImplementation(async () => {
      throw error;
    });
    const open = button(harness.render(), "Open Folder");
    assert.ok(open);
    await open.props.onClick();
    assert.equal(harness.push.mock.callCount(), 0);
    const notice = harness
      .render()
      .find((element) => element.type === DocumentAccessNotice);
    assert.ok(notice);
    assert.equal((notice.props as { error: unknown }).error, error);
    assert.equal(button(harness.render(), "Download Zip"), undefined);
  });
}

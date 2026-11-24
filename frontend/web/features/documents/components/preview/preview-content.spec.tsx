import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PreviewContent } from "./preview-content";
import { DocumentItemType, PreviewFileType } from "../../types/documents.enums";
import { getPreviewFileType } from "../../utils/documents.utils";
import { MIME_TYPES } from "../../types/documents.constants";
import type { DocumentPreviewItem } from "../../types/documents.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FilePreviewModal } from "./file-preview-modal";
import { DocumentIcon } from "../common/document-icon";
import { PreviewStatus } from "./preview-status";
import { canUseOfficeViewer } from "../../utils/office-preview.utils";

const item: DocumentPreviewItem = {
  id: "preview-file",
  type: DocumentItemType.FILE,
  name: "report.docx",
  mimeType: MIME_TYPES.WORD_MODERN,
  sizeBytes: 1024,
};

function renderPreview(
  overrides: Partial<React.ComponentProps<typeof PreviewContent>> = {},
) {
  return renderToStaticMarkup(
    <PreviewContent
      item={item}
      previewType={PreviewFileType.OFFICE}
      previewUrl="https://files.example.com/report.docx"
      textContent={null}
      isUrlLoading={false}
      loadingText={false}
      error={null}
      handleDownload={() => {}}
      {...overrides}
    />,
  );
}

test("Office formats resolve by extension or MIME type, including missing extensions", () => {
  for (const name of [
    "report.docx",
    "report.doc",
    "budget.xlsx",
    "budget.xls",
    "slides.pptx",
    "slides.ppt",
  ]) {
    assert.equal(getPreviewFileType(null, name), PreviewFileType.OFFICE);
  }
  for (const mime of [
    MIME_TYPES.WORD_MODERN,
    MIME_TYPES.WORD_LEGACY,
    MIME_TYPES.EXCEL_MODERN,
    MIME_TYPES.EXCEL_LEGACY,
  ]) {
    assert.equal(
      getPreviewFileType(` ${mime.toUpperCase()} `, "report"),
      PreviewFileType.OFFICE,
    );
  }
  assert.equal(
    getPreviewFileType("text/plain", "report.docx"),
    PreviewFileType.OFFICE,
  );
});

test("unsupported files show an explicit explanation and download without a preview URL", () => {
  const markup = renderPreview({
    previewType: PreviewFileType.UNKNOWN,
    previewUrl: undefined,
  });
  assert.match(markup, /Preview is not supported for this file/);
  assert.match(markup, /Download file/);
  assert.doesNotMatch(markup, /<iframe|Could not load preview/);
});

test("Office files on local or private hosts explain why preview is unavailable", () => {
  for (const host of [
    "localhost",
    "127.0.0.1",
    "192.168.1.20",
    "10.0.0.2",
    "172.16.0.2",
    "[::1]",
    "documents.local",
  ]) {
    const markup = renderPreview({
      previewUrl: `http://${host}/api/documents/public/content?ticket=test`,
    });
    assert.match(markup, /Preview is not supported for this file/);
    assert.match(markup, /local or private network/);
    assert.doesNotMatch(markup, /<iframe/);
  }
});

test("public Office URLs retain the viewer with a visible download alternative", () => {
  const markup = renderPreview();
  assert.match(markup, /<iframe/);
  assert.match(markup, /view.officeapps.live.com/);
  assert.match(markup, /Microsoft Office Viewer/);
  assert.match(markup, /Download file/);
});

test("loading failures do not claim that the file format is unsupported", () => {
  const markup = renderPreview({ error: new Error("Preview request failed") });
  assert.match(markup, /Could not load preview/);
  assert.doesNotMatch(markup, /Preview is not supported/);
});

test("known unsupported image formats do not enter the browser image viewer", () => {
  for (const [mime, name] of [
    ["image/heic", "photo.heic"],
    ["image/tiff", "scan.tiff"],
    ["image/vnd.adobe.photoshop", "design.psd"],
  ]) {
    assert.equal(getPreviewFileType(mime, name), PreviewFileType.UNKNOWN);
  }
  assert.equal(
    getPreviewFileType("image/png", "photo.png"),
    PreviewFileType.IMAGE,
  );
  assert.equal(
    getPreviewFileType("text/csv", "budget.csv"),
    PreviewFileType.TEXT,
  );
});

function descendants(
  node: React.ReactNode,
): React.ReactElement<Record<string, unknown>>[] {
  return React.Children.toArray(node).flatMap((child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return [];

    return [
      child as React.ReactElement<Record<string, unknown>>,
      ...descendants(child.props.children),
    ];
  });
}

test("preview header reuses the My Files icon for Word and Excel", (context) => {
  const client = new QueryClient();
  context.after(() => client.clear());
  for (const file of [
    item,
    { ...item, name: "budget.xlsx", mimeType: MIME_TYPES.EXCEL_MODERN },
  ]) {
    let content: React.ReactNode;
    function Harness() {
      content = FilePreviewModal({ item: file, open: true, onClose() {} });

      return null;
    }
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
    const icon = descendants(content).find(
      (node) => node.type === DocumentIcon,
    );
    assert.ok(icon);
    assert.equal(icon.props.item, file);
  }
});

test("browser media failures show recovery actions and retry the source", (context) => {
  const states: unknown[] = [];
  let stateIndex = 0;
  context.mock.method(React, "useState", ((initial: unknown) => {
    const index = stateIndex++;
    if (!(index in states)) states[index] = initial;

    return [
      states[index],
      (next: unknown) => {
        states[index] = typeof next === "function" ? next(states[index]) : next;
      },
    ];
  }) as typeof React.useState);
  type PreviewProps = React.ComponentProps<typeof PreviewContent>;
  const renderContent = (
    PreviewContent as unknown as {
      type: (
        props: PreviewProps,
      ) => React.ReactElement<Record<string, unknown>>;
    }
  ).type;
  const download = context.mock.fn();
  const retry = context.mock.fn();
  for (const [previewType, tag] of [
    [PreviewFileType.IMAGE, "img"],
    [PreviewFileType.VIDEO, "video"],
    [PreviewFileType.AUDIO, "audio"],
  ] as const) {
    states.length = 0;
    const props: PreviewProps = {
      item,
      previewType,
      previewUrl: "https://files.example.com/media",
      textContent: null,
      isUrlLoading: false,
      loadingText: false,
      error: null,
      handleDownload: download,
      onRetry: retry,
    };
    const render = () => {
      stateIndex = 0;

      return renderContent(props);
    };
    const initial = descendants(render()).find((node) => node.type === tag);
    assert.ok(initial);
    (initial.props.onError as () => void)();
    const failed = render();
    assert.equal(failed.type, PreviewStatus);
    assert.equal(failed.props.failed, true);
    (failed.props.onDownload as () => void)();
    (failed.props.onRetry as () => void)();
    assert.ok(descendants(render()).some((node) => node.type === tag));
  }
  assert.equal(download.mock.callCount(), 3);
  assert.equal(retry.mock.callCount(), 3);
});

test("Office source checks reject invalid and private URLs while preserving public URLs", () => {
  for (const url of [
    "/api/documents/public/content",
    "blob:https://example.com/source",
    "https://user:password@example.com/file",
    "http://169.254.169.254/file",
    "http://[fd00::1]/file",
    "http://[fe80::1]/file",
    "http://localhost./file",
  ]) {
    assert.equal(canUseOfficeViewer(url), false, url);
  }
  for (const url of [
    "https://files.example.com/report.xlsx",
    "https://files.example.com/api/documents/public/content?ticket=signed",
    "https://[2606:4700::1111]/file",
  ]) {
    assert.equal(canUseOfficeViewer(url), true, url);
  }
});

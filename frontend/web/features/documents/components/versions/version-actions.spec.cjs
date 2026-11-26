/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS interaction harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const {
  createSourceLoader,
} = require("../../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../../.."));

function descendants(node) {
  return React.Children.toArray(node).flatMap((child) =>
    React.isValidElement(child)
      ? [child, ...descendants(child.props.children)]
      : [],
  );
}

test("one version action trigger groups preview, download and Owner-only deletion", () => {
  const { VersionActionsMenu } = load(
    "features/documents/components/versions/version-actions-menu.tsx",
  );
  const calls = [];
  const props = {
    version: { id: "old", versionNumber: 1, isCurrent: false },
    versionCount: 2,
    canDelete: true,
    onPreview: () => calls.push("preview"),
    onDownload: () => calls.push("download"),
    onDelete: () => calls.push("delete"),
  };
  const nodes = descendants(VersionActionsMenu(props));
  assert.equal(
    nodes.filter((node) => node.props.label === "Actions for version 1").length,
    1,
  );
  for (const label of ["Preview version", "Download version"]) {
    const action = nodes.find(
      (node) =>
        typeof node.props.onClick === "function" &&
        React.Children.toArray(node.props.children).includes(label),
    );
    assert.ok(action);
    action.props.onClick();
  }
  assert.deepEqual(calls, ["preview", "download"]);
  const deletion = nodes.find(
    (node) => node.type.name === "DocumentActionMenuItem",
  );
  assert.ok(deletion);
  deletion.type(deletion.props).props.onClick({ stopPropagation() {} });
  assert.deepEqual(calls, ["preview", "download", "delete"]);
  assert.ok(
    !descendants(VersionActionsMenu({ ...props, canDelete: false })).some(
      (node) => node.type.name === "DocumentActionMenuItem",
    ),
  );
});

test("Current, final-version and busy deletion actions explain the restriction and never request deletion", () => {
  const notices = [];
  const { VersionActionsMenu } = load(
    "features/documents/components/versions/version-actions-menu.tsx",
    { sonner: { toast: { info: (message) => notices.push(message) } } },
  );
  let deleted = 0;
  const props = {
    version: { id: "old", versionNumber: 1, isCurrent: false },
    versionCount: 2,
    canDelete: true,
    onPreview() {},
    onDownload() {},
    onDelete: () => deleted++,
  };
  for (const patch of [
    { versionCount: 1 },
    { version: { ...props.version, isCurrent: true } },
    { busy: true },
  ]) {
    const deletion = descendants(
      VersionActionsMenu({ ...props, ...patch }),
    ).find((node) => node.type.name === "DocumentActionMenuItem");
    assert.ok(deletion.props.blockedReason);
    deletion.type(deletion.props).props.onClick({ stopPropagation() {} });
  }
  assert.equal(deleted, 0);
  assert.equal(notices.length, 3);
});

test("version deletion requires explicit confirmation and refreshes version history and quota on success", async () => {
  const calls = [];
  const client = {
    invalidateQueries: (query) => {
      calls.push(query.queryKey);

      return Promise.resolve();
    },
  };
  const { VersionDeleteDialog } = load(
    "features/documents/components/versions/version-delete-dialog.tsx",
    {
      "@tanstack/react-query": {
        useQueryClient: () => client,
        useMutation: (options) => ({
          isPending: false,
          mutate: async () => {
            await options.mutationFn();
            options.onSuccess();
          },
        }),
      },
      "../../api/documents.api": {
        documentsApi: {
          deleteVersion: (...args) => {
            calls.push(args);

            return Promise.resolve();
          },
        },
      },
      "../../utils/document-cache": {
        invalidateDocumentVersion: (_client, id) => {
          calls.push(["history", id]);

          return Promise.resolve();
        },
      },
      sonner: { toast: { success() {}, error() {} } },
    },
  );
  const props = {
    item: { id: "file", name: "Report.pdf" },
    version: { id: "v1", versionNumber: 1 },
    isPublic: true,
    onClose: () => calls.push("close"),
    onDeleted: () => calls.push("refresh"),
  };
  let dialog = VersionDeleteDialog(props);
  assert.deepEqual(calls, []);
  assert.match(dialog.props.description, /cannot be restored/);
  dialog.props.onCancel();
  assert.deepEqual(calls, ["close"]);
  calls.length = 0;
  dialog = VersionDeleteDialog(props);
  await dialog.props.onConfirm();
  assert.deepEqual(calls, [
    ["file", "v1", true],
    ["history", "file"],
    ["document-quota"],
    "close",
    "refresh",
  ]);
});

test("deletion API preserves the selected version ID and shared-access request settings", async () => {
  const requests = [];
  const { documentsApi } = load("features/documents/api/documents.api.ts", {
    "@/lib/axios": {
      api: {
        delete: (...args) => {
          requests.push(args);

          return Promise.resolve();
        },
      },
    },
  });
  await documentsApi.deleteVersion("file", "v1");
  await documentsApi.deleteVersion("file", "v1", true);
  assert.equal(requests[0][0], "/api/documents/file/versions/v1");
  assert.equal(requests[1][0], "/api/documents/public/file/versions/v1");
  assert.ok(requests[1][1]);
});

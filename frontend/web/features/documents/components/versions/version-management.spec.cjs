/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS interaction harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
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

test("version drop zone forwards all dropped files for single-file validation and blocks drops while busy", () => {
  const { VersionUploader } = load(
    "features/documents/components/versions/version-uploader.tsx",
    {
      react: {
        ...React,
        useState: () => [false, () => {}],
        useRef: () => ({ current: 0 }),
      },
    },
  );
  const received = [];
  const props = {
    isUploading: false,
    fileInputRef: { current: null },
    onFileChange() {},
    onTriggerFileSelect() {},
    onFilesDropped: (files) => received.push(files),
  };
  const files = [new File(["one"], "one.txt"), new File(["two"], "two.txt")];
  let prevented = 0,
    stopped = 0;
  const event = {
    dataTransfer: { files },
    preventDefault: () => prevented++,
    stopPropagation: () => stopped++,
  };
  VersionUploader(props).props.onDrop(event);
  assert.deepEqual(received, [files]);
  VersionUploader({ ...props, isUploading: true }).props.onDrop(event);
  assert.equal(received.length, 1);
  assert.equal(prevented, 2);
  assert.equal(stopped, 2);
});

test("version selection changes locally and saves only on the explicit Save action", () => {
  let selected = "v1";
  const { VersionHistoryTable } = load(
    "features/documents/components/versions/version-history-table.tsx",
    {
      react: {
        ...React,
        useState: () => [
          selected,
          (value) => {
            selected = value;
          },
        ],
        useId: () => "current-version",
      },
      "@/features/user-setting/hooks/use-account-timezone": {
        useAccountTimezone() {},
      },
    },
  );
  const saved = [];
  const versions = [
    {
      id: "v2",
      versionNumber: 2,
      sizeBytes: 20,
      createdAt: "2026-11-24T00:00:00Z",
      isCurrent: false,
    },
    {
      id: "v1",
      versionNumber: 1,
      sizeBytes: 10,
      createdAt: "2026-11-23T00:00:00Z",
      isCurrent: true,
    },
  ];
  const props = {
    versions,
    item: { id: "file" },
    isLoading: false,
    canChangeCurrent: true,
    onPreviewVersion() {},
    onDownload() {},
    onSaveCurrent: (id) => saved.push(id),
  };
  const render = () => VersionHistoryTable(props);
  const initial = render();
  assert.equal(initial.props.value, "v1");
  initial.props.onValueChange("v2");
  assert.deepEqual(saved, []);
  const save = descendants(render()).find(
    (node) => node.props.children === "Save current version",
  );
  assert.equal(save.props.disabled, false);
  save.props.onClick();
  assert.deepEqual(saved, ["v2"]);
  for (const patch of [{ savingCurrent: true }, { uploadInProgress: true }]) {
    const controls = VersionHistoryTable({ ...props, ...patch });
    assert.equal(controls.props.disabled, true);
  }
  const viewerMarkup = renderToStaticMarkup(
    VersionHistoryTable({ ...props, canChangeCurrent: false }),
  );
  assert.doesNotMatch(viewerMarkup, /type="radio"|Save current version/);
  assert.match(viewerMarkup, /v1<\/span>[\s\S]*?>Current<\/span>/);
  const afterDelete = VersionHistoryTable({
    ...props,
    versions: [versions[1]],
  });
  assert.equal(
    afterDelete.props.value,
    "v1",
    "a deleted unsaved selection returns to Current",
  );
  assert.equal(
    descendants(afterDelete).find(
      (node) => node.props.children === "Save current version",
    ).props.disabled,
    true,
  );
});

test("version progress floats above the modal and can be hidden during upload", () => {
  const { UploadProgress } = load(
    "features/documents/components/common/upload-progress.tsx",
    {
      "@/components/ui/dialog": { DialogPortal: ({ children }) => children },
    },
  );
  const markup = renderToStaticMarkup(
    React.createElement(UploadProgress, {
      floating: true,
      versionUpload: true,
      onDismiss() {},
      uploads: [
        {
          id: "upload",
          fileName: "report.pdf",
          sizeBytes: 10,
          state: "UPLOADING",
          progress: 50,
        },
      ],
    }),
  );
  assert.match(markup, /data-modal-companion="floating-utility"/);
  assert.match(markup, /fixed z-\[300\]/);
  assert.match(markup, /Hide upload progress/);
  assert.match(markup, /Uploading version/);
});

test("closing the version modal or hiding progress does not stop the upload", async () => {
  const states = [],
    refs = [];
  let stateIndex = 0,
    refIndex = 0,
    uploading = false,
    options,
    finish;
  const calls = [];
  const { VersionUploadProvider } = load(
    "features/documents/components/versions/version-upload-provider.tsx",
    {
      react: {
        ...React,
        useCallback: (callback) => callback,
        useState(initial) {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial;

          return [
            states[index],
            (next) => {
              states[index] =
                typeof next === "function" ? next(states[index]) : next;
            },
          ];
        },
        useRef(initial) {
          return (refs[refIndex++] ??= { current: initial });
        },
      },
      "../../hooks/useDocumentUpload": {
        useDocumentUpload(currentOptions) {
          options = currentOptions;

          return {
            uploads: [{ id: "upload" }],
            isUploading: uploading,
            uploadFile(file, target) {
              calls.push([file.name, target]);
              uploading = true;

              return new Promise((resolve) => {
                finish = () => {
                  uploading = false;
                  options.onSuccess();
                  resolve();
                };
              });
            },
            retryFailed() {},
            dismissUploads() {
              calls.push("dismiss");
            },
          };
        },
      },
      sonner: { toast: { info() {} } },
    },
  );
  const render = (children) => {
    stateIndex = refIndex = 0;

    return VersionUploadProvider({ children });
  };
  let completed = 0;
  const target = { documentId: "original", isPublic: true };
  const pending = render("modal").props.value.uploadVersion(
    new File(["file"], "report.pdf"),
    target,
    () => completed++,
  );
  const closedModal = render(null);
  const widget = descendants(closedModal).find(
    (node) => node.type.name === "UploadProgress",
  );
  assert.ok(widget, "the queue remains when modal content closes");
  widget.props.onDismiss();
  assert.ok(
    !descendants(render(null)).some(
      (node) => node.type.name === "UploadProgress",
    ),
  );
  assert.deepEqual(
    calls,
    [["report.pdf", target]],
    "hiding must not dismiss active work",
  );
  finish();
  await pending;
  assert.equal(completed, 1);
});

test("version uploads reject multiple files while ordinary My Files uploads keep batching", async () => {
  const calls = [],
    errors = [];
  const { useDocumentUpload } = load(
    "features/documents/hooks/useDocumentUpload.ts",
    {
      react: {
        ...React,
        useState: (initial) => [initial, () => {}],
        useRef: (initial) => ({ current: initial }),
        useEffect() {},
        useCallback: (callback) => callback,
      },
      "@tanstack/react-query": {
        useQueryClient: () => ({ invalidateQueries: () => Promise.resolve() }),
        useMutation: (options) => ({
          mutateAsync: async (variables) => {
            const result = await options.mutationFn(variables);
            options.onSuccess(result, variables);

            return result;
          },
        }),
      },
      "../api/documents.api": {
        documentsApi: {
          getNameConflict: () => Promise.resolve({ exists: false }),
          uploadFile: (file) => {
            calls.push(`file:${file.name}`);

            return Promise.resolve();
          },
          uploadNewVersion: (id, file) => {
            calls.push(`version:${id}:${file.name}`);

            return Promise.resolve();
          },
        },
      },
      "./use-file-drop-zone": { useFileDropZone: () => false },
      "../utils/document-cache": {
        invalidateDocumentVersion: () => Promise.resolve(),
      },
      sonner: {
        toast: {
          error: (message) => errors.push(message),
          info() {},
          success() {},
        },
      },
    },
  );
  const hook = useDocumentUpload({
    currentFolderId: null,
    enableDropZone: false,
  });
  const files = [new File(["one"], "one.txt"), new File(["two"], "two.txt")];
  const target = { documentId: "original", isPublic: false };
  await hook.uploadFile(files, target);
  assert.deepEqual(calls, []);
  assert.deepEqual(errors, ["Please upload one version at a time."]);
  await hook.uploadFile(files[0], target);
  await hook.uploadFile(files);
  assert.deepEqual(calls, [
    "version:original:one.txt",
    "file:one.txt",
    "file:two.txt",
  ]);
});

test("shared Markdown preview reloads the selected current version and historical version text", async () => {
  const states = [],
    refs = [],
    effects = [];
  let stateIndex = 0,
    refIndex = 0,
    current = "v2";
  const SharedPreview = () => null;
  const VersionManagementModal = () => null;
  const item = {
    id: "document",
    name: "notes.md",
    mimeType: "text/markdown",
    type: "FILE",
    sizeBytes: 10,
    userRole: "EDITOR",
  };
  const { default: View } = load(
    "app/(public)/documents/shared/[id]/components/shared-document-view.tsx",
    {
      react: {
        ...React,
        useCallback: (callback) => callback,
        useState(initial) {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial;

          return [
            states[index],
            (next) => {
              states[index] =
                typeof next === "function" ? next(states[index]) : next;
            },
          ];
        },
        useRef(initial) {
          return (refs[refIndex++] ??= { current: initial });
        },
        useEffect(effect) {
          effects.push(effect);
        },
      },
      "@/store/store": {
        useAppSelector: (selector) =>
          selector({ auth: { accessToken: "test" } }),
      },
      "@/features/documents/api/documents.api": {
        documentsApi: {
          getPublicDocument: () =>
            Promise.resolve({ item, userRole: "EDITOR" }),
          getPublicPreviewUrl: (_id, versionId) =>
            Promise.resolve(
              `https://files.example.com/${versionId || current}`,
            ),
          getTextPreview: (url) => Promise.resolve(`Markdown from ${url}`),
        },
      },
      "@/features/documents/components/versions/version-management-modal":
        VersionManagementModal,
      "./shared-preview": { SharedPreview },
      "./shared-folder-browser": { SharedFolderBrowser: () => null },
    },
  );
  const render = () => {
    stateIndex = refIndex = 0;

    return View({ id: item.id });
  };
  render();
  const cleanup = effects[0]();
  await new Promise(setImmediate);
  let nodes = descendants(render());
  assert.match(
    nodes.find((node) => node.type === SharedPreview).props.textContent,
    /v2$/,
  );
  current = "v1";
  await nodes
    .find((node) => node.type === VersionManagementModal)
    .props.onVersionUploaded();
  nodes = descendants(render());
  assert.match(
    nodes.find((node) => node.type === SharedPreview).props.textContent,
    /v1$/,
  );
  nodes
    .find((node) => node.type === VersionManagementModal)
    .props.onPreviewVersion(item, "v2");
  await new Promise(setImmediate);
  nodes = descendants(render());
  assert.match(
    nodes.find((node) => node.type === SharedPreview).props.textContent,
    /v2$/,
  );
  cleanup();
});

test("current version API sends the selected ID through the private or shared route", async () => {
  const requests = [];
  const { documentsApi } = load("features/documents/api/documents.api.ts", {
    "@/lib/axios": {
      api: {
        put: (...args) => {
          requests.push(args);

          return Promise.resolve({ data: { data: { id: "document" } } });
        },
      },
    },
  });
  await documentsApi.setCurrentVersion("document", "chosen");
  await documentsApi.setCurrentVersion("document", "chosen", true);
  assert.equal(requests[0][0], "/api/documents/document/versions/current");
  assert.equal(
    requests[1][0],
    "/api/documents/public/document/versions/current",
  );
  assert.deepEqual(requests[0][1], { versionId: "chosen" });
  assert.deepEqual(requests[1][1], { versionId: "chosen" });
  assert.ok(requests[1][2]);
});

test("text preview fetches fresh content, caps long text and rejects failed responses", async (context) => {
  const { documentsApi } = load("features/documents/api/documents.api.ts");
  let response = new Response("new version text");
  context.mock.method(globalThis, "fetch", async () => response);
  assert.equal(
    await documentsApi.getTextPreview("https://files.example.com/content"),
    "new version text",
  );
  response = new Response("x".repeat(102401));
  const text = await documentsApi.getTextPreview(
    "https://files.example.com/content",
  );
  assert.match(text, /Preview truncated/);
  assert.equal(text.indexOf("\n"), 102400);
  response = new Response("denied", { status: 403 });
  await assert.rejects(
    documentsApi.getTextPreview("https://files.example.com/content"),
  );
});

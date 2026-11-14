const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(relative, stubs = {}) {
  const filename = path.resolve(__dirname, "..", relative);
  const target = new Module(filename, module);
  target.filename = filename;
  target.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = target.require.bind(target);
  target.require = (request) => {
    if (Object.hasOwn(stubs, request)) return stubs[request];
    if (request.endsWith(".module.css")) return {};
    if (request.startsWith(".") || request.startsWith("@/")) {
      const base = request.startsWith("@/")
        ? path.resolve(__dirname, "..", request.slice(2))
        : path.resolve(path.dirname(filename), request);
      const dependency = [".ts", ".tsx"]
        .map((extension) => base + extension)
        .find((file) => fs.existsSync(file));
      if (dependency)
        return load(
          path.relative(path.resolve(__dirname, ".."), dependency),
          stubs,
        );
    }
    return originalRequire(request);
  };
  target._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename,
  );
  return target.exports;
}

function render(summary, extra = {}) {
  let creates = 0;
  const { MeetingRecordingSummary } = load(
    "features/meeting/components/recordings/meeting-recording-summary.tsx",
    {
      "../../hooks/use-meeting-summary": {
        useMeetingSummary: () => ({
          summary,
          loading: false,
          unavailable: false,
          creating: false,
          createError: false,
          refresh() {},
          create() {
            creates++;
          },
          ...extra,
        }),
      },
      "../ui/meeting-form-controls": {
        MeetingButton: ({ children, tone, loading, ...props }) =>
          React.createElement("button", props, children),
      },
      "@/lib/ai-feedback": {
        aiServiceMessage: (message, fallback) => message || fallback,
      },
    },
  );
  return {
    html: renderToStaticMarkup(
      React.createElement(MeetingRecordingSummary, {
        recordingId: "recording",
      }),
    ),
    creates,
  };
}

test("recording controls distinguish pending startup, active capture and finalization", () => {
  const { recordingControlLabel } = load(
    "features/meeting/utils/recording-control-label.ts",
  );
  assert.equal(recordingControlLabel(null), "Record");
  for (const [status, label] of [
    ["STARTING", "Starting…"],
    ["RECORDING", "Recording"],
    ["PAUSED", "Paused"],
    ["PROCESSING", "Processing…"],
  ])
    assert.equal(
      recordingControlLabel({ status, stopRequestedAt: null }),
      label,
    );
  assert.equal(
    recordingControlLabel({ status: "RECORDING", stopRequestedAt: "now" }),
    "Processing…",
  );
});

test("failed startup and in-progress merges have distinct actionable messages", () => {
  const { recordingFailureMessage } = load(
    "features/meeting/utils/recording-errors.ts",
  );
  assert.match(
    recordingFailureMessage("START_UNCONFIRMED", "FAILED"),
    /did not start/,
  );
  assert.match(
    recordingFailureMessage("RECORDING_CAPTURE_LOST", "FAILED"),
    /tab capture ended/,
  );
  assert.match(
    recordingFailureMessage("MERGE_PENDING", "PROCESSING"),
    /Combining/,
  );
  assert.doesNotMatch(
    recordingFailureMessage("MERGE_PENDING", "PROCESSING"),
    /failed|could not/,
  );
});

test("disabled and unavailable AI keep a visible explanation without offering generation", () => {
  const disabled = render({
    enabled: false,
    status: "NOT_CREATED",
    canCreate: false,
  });
  assert.match(disabled.html, /Meeting summary/);
  assert.match(disabled.html, /not configured/);
  assert.doesNotMatch(disabled.html, /Summarize with AI/);
  const unavailable = render({
    enabled: true,
    availability: "UNAVAILABLE",
    status: "NOT_CREATED",
    canCreate: false,
  });
  assert.match(unavailable.html, /Check availability/);
  assert.doesNotMatch(unavailable.html, /Only the recording owner/);
});

test("only an eligible owner gets manual generation and rendering never starts a job", () => {
  const owner = render({
    enabled: true,
    status: "NOT_CREATED",
    canCreate: true,
  });
  assert.match(owner.html, /Summarize with AI/);
  assert.match(owner.html, /local speech service/);
  assert.doesNotMatch(owner.html, /Google/);
  assert.equal(owner.creates, 0);
  const shared = render({
    enabled: true,
    status: "NOT_CREATED",
    canCreate: false,
  });
  assert.match(shared.html, /Only the recording owner/);
  assert.doesNotMatch(shared.html, /Summarize with AI/);
});

test("saved content remains readable when processing is offline and user content is escaped", () => {
  const saved = render({
    enabled: true,
    availability: "UNAVAILABLE",
    status: "COMPLETED",
    canCreate: false,
    content: "<script>private text</script>",
  });
  assert.match(saved.html, /&lt;script&gt;private text&lt;\/script&gt;/);
  assert.doesNotMatch(saved.html, /Summarize with AI/);
});

test("running summaries cannot be regenerated and only failed eligible owners can retry", () => {
  const running = render({
    enabled: true,
    status: "RUNNING",
    stage: "TRANSCRIBING",
    transcribedChunks: 3,
    canCreate: true,
  });
  assert.match(running.html, /Transcribing/);
  assert.match(running.html, /Processed 3 segments/);
  assert.doesNotMatch(running.html, /Summarize with AI/);
  assert.match(
    render({ enabled: true, status: "FAILED", canCreate: true }).html,
    /Retry summary/,
  );
  assert.doesNotMatch(
    render({ enabled: true, status: "FAILED", canCreate: false }).html,
    /Retry summary/,
  );
});

function recordingControls({
  captureEnded = false,
  captureError,
  startError,
} = {}) {
  let releases = 0,
    stops = 0,
    errors = 0;
  const mutation = { isPending: false, mutate() {} };
  const { MeetingRecordingControls } = load(
    "features/meeting/components/room/meeting-recording-controls.tsx",
    {
      react: {
        ...React,
        useEffect() {},
        useState: (initial) => [initial === null ? "start" : initial, () => {}],
      },
      "../../utils/meeting-action-errors": {
        showMeetingActionError() {
          errors++;
        },
      },
      "@/components/ui/dialog": {
        Dialog: "dialog",
        DialogContent: "div",
        DialogTitle: "h2",
        DialogDescription: "p",
      },
      "@/store/store": { useAppSelector: () => "owner" },
      "../../hooks/useMeetingRecording": {
        useMeetingRecording: () => ({
          query: {
            data: {
              ownerId: "owner",
              recording: null,
              capabilities: { canStart: true },
              recordingAvailable: true,
            },
          },
          start: {
            ...mutation,
            async mutateAsync() {
              if (startError) throw startError;
              return { id: "accepted-recording", status: "STARTING" };
            },
          },
          stop: {
            ...mutation,
            async mutateAsync(value) {
              assert.equal(value.id, "accepted-recording");
              stops++;
            },
          },
          pause: mutation,
          resume: mutation,
          requestPermission: mutation,
          answerPermissionRequest: mutation,
        }),
      },
      "../../hooks/useMeetingTabCapture": {
        useMeetingTabCapture: () => ({
          async capture() {
            if (captureError) throw captureError;
            return "TR_synthetic";
          },
          async release() {
            releases++;
          },
          isCapturing: () => !captureEnded,
        }),
      },
      "../../utils/recording-control-label": {
        recordingControlLabel: () => "Record",
      },
      "../common/meeting-room-control-button": {
        MeetingRoomControlButton: "button",
      },
      "../ui/meeting-form-controls": { MeetingButton: "button" },
      "./meeting-recording-requests": { MeetingRecordingRequests: "div" },
    },
  );
  function findButton(node) {
    if (!node || typeof node !== "object") return undefined;
    if (Array.isArray(node)) return node.map(findButton).find(Boolean);
    if (node.props?.children === "Start recording" && node.props?.onClick)
      return node;
    return findButton(node.props?.children);
  }
  const button = findButton(
    MeetingRecordingControls({ joinToken: "meeting", meetingId: "meeting" }),
  );
  assert.ok(button);
  return {
    submit: button.props.onClick,
    counts: () => ({ releases, stops, errors }),
  };
}

test("capture ending during Start stops the accepted recording even before the query refreshes", async () => {
  const f = recordingControls({ captureEnded: true });
  await f.submit();
  assert.equal(f.counts().stops, 1);
});

test("cancelled capture is released and Start failures do not produce a second error toast", async () => {
  const cancelled = recordingControls({
    captureError: Object.assign(new Error("Picker cancelled"), {
      name: "NotAllowedError",
    }),
  });
  await cancelled.submit();
  assert.deepEqual(cancelled.counts(), { releases: 1, stops: 0, errors: 1 });
  const rejected = recordingControls({
    startError: new Error("Recorder unavailable"),
  });
  await rejected.submit();
  assert.deepEqual(rejected.counts(), { releases: 1, stops: 0, errors: 0 });
});

function findElements(node, predicate) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node))
    return node.flatMap((child) => findElements(child, predicate));
  return [
    ...(predicate(node) ? [node] : []),
    ...findElements(node.props?.children, predicate),
  ];
}

test("recording permissions map view/download choices and lock editing for shared viewers", () => {
  const changes = [];
  const { RecordingPermissionSelect } = load(
    "features/meeting/components/recordings/recording-permission-select.tsx",
    { "../ui/meeting-form-controls": { MeetingSelect: "select" } },
  );
  const select = RecordingPermissionSelect({
    canDownload: false,
    onChange: (value) => changes.push(value),
    label: "Access",
  });
  select.props.onChange("download");
  select.props.onChange("view");
  assert.deepEqual(changes, [true, false]);
  const { RecordingAccessList } = load(
    "features/meeting/components/recordings/recording-access-list.tsx",
    {
      "@/features/user-setting/hooks/useUserSettingQueries": {
        useBulkUserProfilesByEmailsQuery: () => ({}),
      },
      "../ui/meeting-form-controls": {
        MeetingButton: "button",
        MeetingSelect: "select",
      },
      "@/components/common/user-avatar": { UserAvatar: "span" },
    },
  );
  const sharedTree = RecordingAccessList({
    isOwner: false,
    permissions: [{ userId: "viewer", canDownload: false }],
    loading: false,
    error: false,
    disabled: false,
    pendingAction: null,
    onPermissionChange() {},
    onRemove() {},
  });
  assert.ok(
    findElements(
      sharedTree,
      (node) => node.props?.label === "Recording permission for Shared account",
    )[0].props.disabled,
  );
  assert.ok(
    findElements(sharedTree, (node) => node.type === "button")[0].props
      .disabled,
  );
  const removed = [];
  const ownerChanges = [];
  const ownerTree = RecordingAccessList({
    isOwner: true,
    permissions: [{ userId: "viewer", canDownload: false }],
    loading: false,
    error: false,
    disabled: false,
    pendingAction: null,
    onPermissionChange: (...args) => ownerChanges.push(args),
    onRemove: (id) => removed.push(id),
  });
  findElements(
    ownerTree,
    (node) => node.props?.label === "Recording permission for Shared account",
  )[0].props.onChange(true);
  findElements(ownerTree, (node) => node.type === "button")[0].props.onClick();
  assert.deepEqual(ownerChanges, [["viewer", true]]);
  assert.deepEqual(removed, ["viewer"]);
});

test("recording menu preserves actions, pending states and owner permission hints", () => {
  const calls = [];
  const { MeetingRecordingCard } = load(
    "features/meeting/components/recordings/meeting-recording-card.tsx",
    {
      "@/components/ui/dropdown-menu": {
        DropdownMenu: "menu",
        DropdownMenuTrigger: "trigger",
        DropdownMenuContent: "content",
        DropdownMenuItem: "menuitem",
        DropdownMenuSeparator: "hr",
      },
      "../ui/meeting-form-controls": { MeetingButton: "button" },
      "@/lib/permission-feedback": {
        PERMISSION_REASON: {
          recordingManage: "Owner only",
          recordingDownload: "Download not allowed",
        },
      },
    },
  );
  const props = {
    recording: {
      title: "Demo",
      status: "COMPLETED",
      requestedAt: "2026-11-14T10:00:00Z",
      capabilities: { canManage: true, canDownload: true },
    },
    downloading: false,
    deleting: false,
    downloadDisabled: false,
    deleteDisabled: false,
    onWatch() {},
    onDownload() {},
    onShare: () => calls.push("share"),
    onRename: () => calls.push("rename"),
    onDelete: () => calls.push("delete"),
  };
  const owner = MeetingRecordingCard(props);
  const actions = findElements(owner, (node) => node.type === "menuitem");
  assert.equal(actions.length, 3);
  actions.forEach((action) => action.props.onClick());
  assert.deepEqual(calls, ["share", "rename", "delete"]);
  const viewer = MeetingRecordingCard({
    ...props,
    recording: {
      ...props.recording,
      capabilities: { canManage: false, canDownload: false },
    },
    deleting: true,
    deleteDisabled: true,
  });
  assert.ok(
    findElements(viewer, (node) => node.type === "menuitem").every(
      (action) => action.props.disabledReason === "Owner only",
    ),
  );
  assert.equal(
    findElements(viewer, (node) => node.type === "menuitem")[2].props.disabled,
    true,
  );
  assert.equal(
    findElements(
      viewer,
      (node) => node.props?.["aria-label"] === "More actions for Demo",
    )[0].props.disabled,
    true,
  );
});

test("recording pagination reuses common navigation and can show a single-page result count", () => {
  const { MeetingPagination } = load(
    "features/meeting/components/common/meeting-pagination.tsx",
    {
      "../ui/meeting-form-controls": { MeetingButton: "button" },
      "@/components/ui/button": { Button: "button" },
    },
  );
  const pageChanges = [];
  const tree = MeetingPagination({
    page: 1,
    limit: 12,
    total: 25,
    totalPages: 3,
    onPageChange: (value) => pageChanges.push(value),
  });
  findElements(
    tree,
    (node) => node.props?.["aria-label"] === "Next",
  )[0].props.onClick();
  assert.deepEqual(pageChanges, [2]);
  assert.equal(
    MeetingPagination({
      page: 1,
      limit: 12,
      total: 1,
      totalPages: 1,
      onPageChange() {},
    }),
    null,
  );
  const single = renderToStaticMarkup(
    MeetingPagination({
      page: 1,
      limit: 12,
      total: 1,
      totalPages: 1,
      showSinglePage: true,
      onPageChange() {},
    }),
  );
  assert.match(single, /Showing 1-1 of 1/);
});

test("inclusive local recording dates include the entire last day across daylight saving transitions", () => {
  const originalTZ = process.env.TZ;
  try {
    process.env.TZ = "America/New_York";
    const { recordingDateBounds } = load(
      "features/meeting/utils/recording-date-filter.ts",
    );
    const spring = recordingDateBounds({
      from: "2026-03-08",
      to: "2026-03-08",
    });
    assert.equal(
      new Date(spring.toDate) - new Date(spring.fromDate),
      23 * 60 * 60 * 1000,
    );
    const autumn = recordingDateBounds({
      from: "2026-11-01",
      to: "2026-11-01",
    });
    assert.equal(
      new Date(autumn.toDate) - new Date(autumn.fromDate),
      25 * 60 * 60 * 1000,
    );
    assert.equal(
      recordingDateBounds({ from: "2026-11-15", to: "2026-11-14" }).invalid,
      true,
    );
    assert.equal(recordingDateBounds({ from: "", to: "" }).fromDate, undefined);
    assert.equal(recordingDateBounds({ from: "", to: "" }).toDate, undefined);
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});

test("saved summary remains Ready while processing workers are unavailable", () => {
  const { meetingSummaryPresentation } = load(
    "features/meeting/utils/meeting-summary-presentation.ts",
  );
  assert.equal(
    meetingSummaryPresentation(
      { status: "COMPLETED", enabled: true, availability: "UNAVAILABLE" },
      false,
    ).label,
    "Ready",
  );
  assert.equal(
    meetingSummaryPresentation({ status: "RUNNING", enabled: true }, false)
      .label,
    "In progress",
  );
  assert.equal(
    meetingSummaryPresentation(undefined, true).label,
    "Unavailable",
  );
});

test("recording filters show Clear filters only for active filters and reset explicitly", () => {
  const { MeetingRecordingFilters } = load(
    "features/meeting/components/recordings/meeting-recording-filters.tsx",
    {
      "../ui/meeting-form-controls": {
        MeetingButton: "button",
        MeetingInput: "input",
      },
      "@/components/ui/custom/custom-date-picker": {
        CustomDatePicker: "date-picker",
      },
      "@/components/ui/custom/custom-select": { CustomSelect: "select" },
    },
  );
  let resets = 0;
  const props = {
    search: "",
    scope: "all",
    dates: { from: "", to: "" },
    invalidDates: false,
    onSearchChange() {},
    onScopeChange() {},
    onDatesChange() {},
    onReset() {
      resets++;
    },
  };
  assert.equal(
    findElements(
      MeetingRecordingFilters(props),
      (node) => node.type === "button",
    ).length,
    0,
  );
  for (const filter of [
    { search: "demo" },
    { scope: "owned" },
    { dates: { from: "2026-11-14", to: "" } },
    { dates: { from: "", to: "2026-11-14" } },
  ]) {
    const buttons = findElements(
      MeetingRecordingFilters({ ...props, ...filter }),
      (node) => node.type === "button",
    );
    assert.equal(buttons.length, 1);
    buttons[0].props.onClick();
  }
  assert.equal(resets, 4);
});

test("recording sharing selects an account before granting and retains it on failure", async () => {
  const users = [
    { id: "owner", email: "owner@example.test" },
    { id: "shared", email: "shared@example.test" },
    { id: "new", email: "new@example.test", avatarUrl: "private/avatar" },
  ];
  const cells = [];
  let cursor = 0;
  const { RecordingShareForm } = load(
    "features/meeting/components/recordings/recording-share-form.tsx",
    {
      react: {
        ...React,
        useState(initial) {
          const index = cursor++;
          if (!(index in cells)) cells[index] = initial;
          return [
            cells[index],
            (value) => {
              cells[index] = value;
            },
          ];
        },
      },
      "@/features/calendar/hooks/use-calendar-users": {
        useAttendeeSearch: () => ({ data: users }),
      },
      "@/components/ui/combobox": {
        Combobox: "combobox",
        ComboboxInput: "input",
        ComboboxContent: "popup",
        ComboboxList: "list",
        ComboboxItem: "option",
      },
      "../ui/meeting-form-controls": {
        MeetingButton: "button",
        MeetingSelect: "select",
      },
      "@/components/common/user-avatar": { UserAvatar: "avatar" },
    },
  );
  const grants = [];
  let reject = true;
  const props = {
    ownerId: "owner",
    sharedUserIds: new Set(["shared"]),
    disabled: false,
    granting: false,
    canDownload: false,
    onPermissionChange() {},
    async onGrant(id) {
      grants.push(id);
      if (reject) throw Error("Mock failure");
    },
  };
  const tree = () => {
    cursor = 0;
    return RecordingShareForm(props);
  };
  let form = tree();
  assert.equal(
    findElements(form, (node) => node.type === "button")[0].props.disabled,
    true,
  );
  const options = findElements(form, (node) => node.type === "option");
  assert.equal(options.length, 2);
  assert.equal(options[0].props.disabled, true);
  const combo = findElements(form, (node) => node.type === "combobox")[0];
  combo.props.onValueChange(users[1]);
  assert.equal(cells[1], null);
  combo.props.onValueChange(users[2]);
  combo.props.onInputValueChange(users[2].email, { reason: "item-press" });
  form = tree();
  await form.props.onSubmit({ preventDefault() {} });
  assert.equal(cells[1].id, "new");
  reject = false;
  await tree().props.onSubmit({ preventDefault() {} });
  assert.deepEqual(grants, ["new", "new"]);
  assert.equal(cells[0], "");
  assert.equal(cells[1], null);
});

test("recording access uses current profile photos with snapshot fallback", () => {
  const { RecordingAccessList } = load(
    "features/meeting/components/recordings/recording-access-list.tsx",
    {
      "@/features/user-setting/hooks/useUserSettingQueries": {
        useBulkUserProfilesByEmailsQuery: () => ({
          data: {
            success: true,
            data: [
              {
                email: "VIEWER@example.test",
                fullName: "Current name",
                avatarUrl: "private/current-avatar",
              },
            ],
          },
        }),
      },
      "../ui/meeting-form-controls": {
        MeetingButton: "button",
        MeetingSelect: "select",
      },
      "@/components/common/user-avatar": { UserAvatar: "avatar" },
    },
  );
  const tree = RecordingAccessList({
    isOwner: true,
    ownerProfile: {
      fullName: "Owner",
      email: "owner@example.test",
      avatarUrl: "private/owner-avatar",
    },
    permissions: [
      {
        userId: "viewer",
        canDownload: false,
        profile: {
          fullName: "Old name",
          email: "viewer@example.test",
          avatarUrl: "private/old-avatar",
        },
      },
    ],
    loading: false,
    error: false,
    disabled: false,
    pendingAction: null,
    onPermissionChange() {},
    onRemove() {},
  });
  const people = findElements(tree, (node) => node.props?.avatarUrl);
  assert.equal(people[0].props.avatarUrl, "private/owner-avatar");
  assert.equal(people[1].props.name, "Current name");
  assert.equal(people[1].props.avatarUrl, "private/current-avatar");
  const avatar = findElements(
    people[1].type(people[1].props),
    (node) => node.type === "avatar",
  )[0];
  assert.equal(avatar.props.src, "private/current-avatar");
});

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
  target.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = target.require.bind(target);
  target.require = (request) =>
    Object.hasOwn(stubs, request) ? stubs[request] : originalRequire(request);
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
        MeetingButton: ({ children, tone, ...props }) =>
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

test('failed startup and in-progress merges have distinct actionable messages', () => {
  const { recordingFailureMessage } = load('features/meeting/utils/recording-errors.ts');
  assert.match(recordingFailureMessage('START_UNCONFIRMED', 'FAILED'), /did not start/);
  assert.match(recordingFailureMessage('RECORDING_CAPTURE_LOST', 'FAILED'), /tab capture ended/);
  assert.match(recordingFailureMessage('MERGE_PENDING', 'PROCESSING'), /Combining/);
  assert.doesNotMatch(recordingFailureMessage('MERGE_PENDING', 'PROCESSING'), /failed|could not/);
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

function recordingControls({ captureEnded = false, captureError, startError } = {}) {
  let releases = 0, stops = 0, errors = 0;
  const mutation = { isPending: false, mutate() {} };
  const { MeetingRecordingControls } = load('features/meeting/components/room/meeting-recording-controls.tsx', {
    react: { ...React, useEffect() {}, useState: initial => [initial === null ? 'start' : initial, () => {}] },
    '../../utils/meeting-action-errors': { showMeetingActionError() { errors++; } },
    '@/components/ui/dialog': { Dialog: 'dialog', DialogContent: 'div', DialogTitle: 'h2', DialogDescription: 'p' },
    '@/store/store': { useAppSelector: () => 'owner' },
    '../../hooks/useMeetingRecording': { useMeetingRecording: () => ({
      query: { data: { ownerId: 'owner', recording: null, capabilities: { canStart: true }, recordingAvailable: true } },
      start: { ...mutation, async mutateAsync() { if (startError) throw startError; return { id: 'accepted-recording', status: 'STARTING' }; } },
      stop: { ...mutation, async mutateAsync(value) { assert.equal(value.id, 'accepted-recording'); stops++; } },
      pause: mutation, resume: mutation, requestPermission: mutation, answerPermissionRequest: mutation,
    }) },
    '../../hooks/useMeetingTabCapture': { useMeetingTabCapture: () => ({
      async capture() { if (captureError) throw captureError; return 'TR_synthetic'; },
      async release() { releases++; }, isCapturing: () => !captureEnded,
    }) },
    '../../utils/recording-control-label': { recordingControlLabel: () => 'Record' },
    '../common/meeting-room-control-button': { MeetingRoomControlButton: 'button' },
    '../ui/meeting-form-controls': { MeetingButton: 'button' },
    './meeting-recording-requests': { MeetingRecordingRequests: 'div' },
  });
  function findButton(node) {
    if (!node || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) return node.map(findButton).find(Boolean);
    if (node.props?.children === 'Start recording' && node.props?.onClick) return node;
    return findButton(node.props?.children);
  }
  const button = findButton(MeetingRecordingControls({ joinToken: 'meeting', meetingId: 'meeting' }));
  assert.ok(button);
  return { submit: button.props.onClick, counts: () => ({ releases, stops, errors }) };
}

test('capture ending during Start stops the accepted recording even before the query refreshes', async () => {
  const f = recordingControls({ captureEnded: true });
  await f.submit();
  assert.equal(f.counts().stops, 1);
});

test('cancelled capture is released and Start failures do not produce a second error toast', async () => {
  const cancelled = recordingControls({ captureError: Object.assign(new Error('Picker cancelled'), { name: 'NotAllowedError' }) });
  await cancelled.submit();
  assert.deepEqual(cancelled.counts(), { releases: 1, stops: 0, errors: 1 });
  const rejected = recordingControls({ startError: new Error('Recorder unavailable') });
  await rejected.submit();
  assert.deepEqual(rejected.counts(), { releases: 1, stops: 0, errors: 0 });
});

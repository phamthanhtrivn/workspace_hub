import assert from 'node:assert/strict';
import { test, mock, after } from 'node:test';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';

const web = createRequire(new URL('../../../../package.json', import.meta.url));
const React = web('react');
const feedbackId = web.resolve('./lib/permission-feedback.ts');
const feedback = new Module(feedbackId);
feedback.exports = { logActionError() {}, getActionErrorMessage: (_error, fallback) => fallback };
web.cache[feedbackId] = feedback;
const { toast } = web('sonner');
for (const method of ['error', 'info']) mock.method(toast, method, () => {});
let cleanup = [];
mock.method(React, 'useState', value => [value, () => {}]);
mock.method(React, 'useRef', value => ({ current: value }));
mock.method(React, 'useCallback', callback => callback);
mock.method(React, 'useEffect', effect => { cleanup.push(effect()); });
const { useAudioRecorder } = web('./features/chat/hooks/input/useAudioRecorder.ts');
const previousRecorder = globalThis.MediaRecorder;
const mediaDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
after(() => {
  mock.restoreAll();
  globalThis.MediaRecorder = previousRecorder;
  if (mediaDescriptor) Object.defineProperty(navigator, 'mediaDevices', mediaDescriptor);
  else delete navigator.mediaDevices;
});

class Recorder {
  static preferred = 'audio/mp4';
  static instances = [];
  static isTypeSupported(type) { return type === this.preferred; }
  constructor(stream, options) {
    this.stream = stream; this.mimeType = options?.mimeType ?? 'audio/webm'; this.state = 'inactive';
    Recorder.instances.push(this);
  }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['test-audio'], { type: this.mimeType }) });
    this.onstop?.();
  }
}
globalThis.MediaRecorder = Recorder;

function setup(getStream) {
  cleanup = []; Recorder.instances = [];
  let stopped = 0;
  const stream = { getTracks: () => [{ stop: () => { stopped++; } }] };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: getStream ?? (async () => stream) } });
  const files = [];
  const recorder = useAudioRecorder({ onRecordComplete: file => files.push(file) });
  return { recorder, files, stream, stopped: () => stopped, dispose: () => cleanup.forEach(fn => fn?.()) };
}

test('actual recorder emits matching MP4/WebM file types and closes microphone tracks', async () => {
  for (const [mime, extension] of [['audio/mp4', 'm4a'], ['audio/webm;codecs=opus', 'webm']]) {
    Recorder.preferred = mime;
    const session = setup();
    try {
      assert.equal(await session.recorder.startRecording(), true);
      assert.equal(await session.recorder.startRecording(), false, 'duplicate starts must not open another stream');
      session.recorder.stopRecording();
      assert.equal(session.files.length, 1);
      assert.ok(session.files[0].name.endsWith(`.${extension}`));
      assert.equal(session.files[0].type, mime.split(';')[0]);
      assert.ok(session.stopped() > 0);
    } finally { session.dispose(); }
  }
});

test('cancel, recording failure and unmount do not attach a voice file', async () => {
  for (const action of ['cancel', 'error', 'unmount']) {
    const session = setup();
    try {
      await session.recorder.startRecording();
      const native = Recorder.instances[0];
      if (action === 'cancel') session.recorder.cancelRecording();
      if (action === 'error') { native.onerror(); native.stop(); }
      if (action === 'unmount') { session.dispose(); native.stop(); }
      assert.equal(session.files.length, 0);
      assert.ok(session.stopped() > 0);
    } finally { session.dispose(); }
  }
});

test('late microphone permission after cancel/unmount is discarded and its stream closed', async () => {
  for (const action of ['cancel', 'unmount']) {
    const pending = Promise.withResolvers();
    const session = setup(() => pending.promise);
    const started = session.recorder.startRecording();
    if (action === 'cancel') session.recorder.cancelRecording();
    else session.dispose();
    pending.resolve(session.stream);
    assert.equal(await started, false);
    assert.equal(Recorder.instances.length, 0);
    assert.equal(session.files.length, 0);
    assert.ok(session.stopped() > 0);
    session.dispose();
  }
});

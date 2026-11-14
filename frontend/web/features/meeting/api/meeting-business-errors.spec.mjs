import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';

const web = createRequire(new URL('../../../package.json', import.meta.url));
const { api } = web('./lib/axios.ts');
web('./lib/interceptors.ts');
const { AxiosError, CanceledError, isCancel } = web('axios');
const { QueryClient } = web('@tanstack/react-query');
const { toast } = web('sonner');
const { recordingApi } = web('./features/meeting/api/meeting-recording.api.ts');
const { captionsApi } = web('./features/meeting/api/meeting-captions.api.ts');
const { sendMeetingMessage, stopMeetingScreenShare, getMeetingMediaPresignedUrls, uploadMeetingMediaToS3 } = web('./features/meeting/api/meeting.api.ts');
const { openMeetingRoomRequests, closeMeetingRoomRequests, meetingRoomRequestSignal } = web('./features/meeting/api/meeting-room-requests.ts');
const { clearMeetingRoomQueries } = web('./features/meeting/utils/meeting-room-queries.ts');
const { showMeetingActionError } = web('./features/meeting/utils/meeting-action-errors.ts');
const { getExpectedApiBusinessMessage } = web('./lib/api-error-policy.ts');
const { logActionError } = web('./lib/permission-feedback.ts');
const { recordingErrorIsPermanent } = web('./features/meeting/utils/recording-errors.ts');

function failure(config, status, message, code) {
  return new AxiosError('Test response', 'ERR_BAD_REQUEST', config, undefined,
    { status, statusText: 'Test', config, headers: {}, data: { message, ...(code && { code }) } });
}
function capture() {
  const errors = [], warnings = [], toasts = [];
  const spies = [mock.method(console, 'error', (...args) => errors.push(args)),
    mock.method(console, 'warn', (...args) => warnings.push(args)),
    mock.method(toast, 'error', (...args) => toasts.push(args))];
  return { errors, warnings, toasts, restore: () => spies.forEach(spy => spy.mock.restore()) };
}

test('participant recording status after host end is silent but still rejects and stops polling', async () => {
  const adapter = api.defaults.adapter, logs = capture();
  api.defaults.adapter = async config => { throw failure(config, 400, 'Meeting is not live'); };
  try {
    await assert.rejects(recordingApi.status('ended-room'), error => {
      assert.equal(getExpectedApiBusinessMessage(error), 'Meeting is not live');
      assert.equal(recordingErrorIsPermanent(error), true);
      logActionError('Expected read failure', error);
      return true;
    });
    assert.equal(logs.errors.length + logs.warnings.length + logs.toasts.length, 0);
  } finally { api.defaults.adapter = adapter; logs.restore(); }
});

test('known chat/recording refusals show their UI reason without console logging', async () => {
  const adapter = api.defaults.adapter, logs = capture();
  let status = 403, message = 'Meeting chat is disabled by the host', code;
  api.defaults.adapter = async config => { throw failure(config, status, message, code); };
  try {
    await assert.rejects(sendMeetingMessage('chat-disabled-room', { content: 'test' }), error => {
      showMeetingActionError(error, 'Fallback'); return true;
    });
    assert.equal(logs.toasts[0][0], message);
    status = 429; message = 'Please wait before requesting recording permission again'; code = 'RECORDING_REQUEST_COOLDOWN';
    await assert.rejects(recordingApi.requestPermission('cooldown-room'), error => {
      showMeetingActionError(error, 'Fallback'); return true;
    });
    assert.equal(logs.toasts[1][0], message);
    assert.equal(logs.errors.length + logs.warnings.length, 0);
  } finally { api.defaults.adapter = adapter; logs.restore(); }
});

test('unknown validation, network, server and other-feature errors retain console diagnostics', async () => {
  const adapter = api.defaults.adapter, logs = capture();
  let status = 500, message = 'Meeting is not live', network = false;
  api.defaults.adapter = async config => { throw network ? new AxiosError('Offline test', 'ERR_NETWORK', config) : failure(config, status, message); };
  try {
    await assert.rejects(recordingApi.status('server-failure-room'));
    status = 400; message = 'Unexpected validation failure';
    await assert.rejects(recordingApi.status('unknown-failure-room'));
    message = 'Meeting is not live';
    await assert.rejects(api.get('/api/other-feature/meeting-test'));
    network = true;
    await assert.rejects(recordingApi.status('offline-room'));
    assert.equal(logs.errors.length, 4);
    const unauthorized = failure({ method: 'get', expectedBusinessErrors: { statuses: [401], messages: [message] } }, 401, message);
    assert.equal(getExpectedApiBusinessMessage(unauthorized), undefined);
  } finally { api.defaults.adapter = adapter; logs.restore(); }
});

test('leaving a room aborts in-flight reads and blocks late cleanup without affecting other rooms or rejoin', async () => {
  const adapter = api.defaults.adapter, logs = capture();
  const dispose = openMeetingRoomRequests('leaving-room');
  const started = Promise.withResolvers(); let requests = 0;
  api.defaults.adapter = config => {
    requests++; started.resolve();
    return new Promise((resolve, reject) => {
      config.signal.addEventListener('abort', () => reject(new CanceledError('Room closed', config)), { once: true });
    });
  };
  try {
    const pending = recordingApi.status('leaving-room');
    await started.promise;
    closeMeetingRoomRequests('leaving-room');
    await assert.rejects(pending, isCancel);
    for (const cleanup of [() => captionsApi.release('leaving-room'), () => stopMeetingScreenShare('leaving-room')]) {
      await assert.rejects(cleanup(), error => { showMeetingActionError(error, 'Cleanup failed'); return isCancel(error); });
    }
    assert.equal(requests, 1, 'closed-room cleanup must not hit the network');
    assert.equal(meetingRoomRequestSignal('/api/meetings/other-room/recordings/status'), undefined);
    assert.equal(meetingRoomRequestSignal('/api/meetings/leaving-room/access'), undefined);
    assert.equal(meetingRoomRequestSignal('/api/meetings/leaving-room/join'), undefined);
    const reopened = openMeetingRoomRequests('leaving-room');
    dispose(); // A late cleanup from the old instance must not abort a rejoined room.
    assert.equal(meetingRoomRequestSignal('/api/meetings/leaving-room/recordings/status').aborted, false);
    reopened();
    assert.equal(logs.errors.length + logs.warnings.length + logs.toasts.length, 0);
  } finally { dispose(); api.defaults.adapter = adapter; logs.restore(); }
});

test('query cleanup covers participant/chat/unread/recording state and preserves history, other rooms and identities', () => {
  const client = new QueryClient();
  const affected = [
    ['meeting-participants', 'room', '', 1], ['meeting-access', 'room'], ['meeting-room', 'room'],
    ['meeting-messages', 'room'], ['meeting-messages', 'room', 'unread-count'],
    ['meeting-join-requests', 'room', 'count'], ['meeting-participant-hand-states', 'room'],
    ['meeting-participant-view-preferences', 'room'], ['meeting-recording-status', 'actor', 'room'],
  ];
  const retained = [['meeting-history'], ['meeting-participants', 'other-room'], ['meeting-recording-status', 'other-actor', 'room']];
  try {
    for (const key of [...affected, ...retained]) client.setQueryData(key, 'present');
    clearMeetingRoomQueries(client, 'room', 'actor');
    for (const key of affected) assert.equal(client.getQueryData(key), undefined);
    for (const key of retained) assert.equal(client.getQueryData(key), 'present');
  } finally { client.clear(); }
});

test('meeting media upload uses the same cancellation scope and cancelled fetch shows no error toast', async () => {
  const adapter = api.defaults.adapter, previousFetch = globalThis.fetch, logs = capture();
  const dispose = openMeetingRoomRequests('upload-room', 'upload-meeting');
  let presigns = 0;
  api.defaults.adapter = async config => {
    presigns++; assert.ok(config.signal);
    return { config, status: 200, statusText: 'OK', headers: {}, data: { data: [] } };
  };
  globalThis.fetch = async (_url, options) => {
    assert.ok(options.signal);
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Room closed', 'AbortError')), { once: true }));
  };
  try {
    await getMeetingMediaPresignedUrls({ meetingId: 'upload-meeting', files: [] });
    const uploading = uploadMeetingMediaToS3(new File(['test'], 'test.txt'), 'https://media.invalid/put', 'upload-meeting');
    closeMeetingRoomRequests('upload-room');
    await assert.rejects(uploading, error => { showMeetingActionError(error, 'Could not upload'); return error.name === 'AbortError'; });
    await assert.rejects(getMeetingMediaPresignedUrls({ meetingId: 'upload-meeting', files: [] }), isCancel);
    assert.equal(presigns, 1);
    assert.equal(logs.errors.length + logs.warnings.length + logs.toasts.length, 0);
  } finally { dispose(); api.defaults.adapter = adapter; globalThis.fetch = previousFetch; logs.restore(); }
});

test('recording listeners cancel pending refresh on end/kick/leave and unregister every listener', () => {
  const React = web('react'), storeModule = web('./store/store.ts');
  const { socketService } = web('./features/chat/api/chat-socket.service.ts');
  const { useRecordingEvents } = web('./features/meeting/hooks/useRecordingEvents.ts');
  const socket = new EventEmitter(); let cleanups = [], changes = 0;
  const spies = [
    mock.method(React, 'useCallback', callback => callback),
    mock.method(React, 'useEffect', effect => { cleanups.push(effect()); }),
    mock.method(React, 'useSyncExternalStore', () => false),
    mock.method(storeModule, 'useAppSelector', selector => selector({ auth: { accessToken: 'test-token', userId: 'actor' } })),
    mock.method(socketService, 'connect', () => socket),
  ];
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    for (const event of ['meeting:ended', 'meeting:participant_removed', 'meeting:participant_left']) {
      cleanups = []; changes = 0;
      useRecordingEvents(() => changes++, 'room');
      socket.emit('meeting:recording_updated', { meetingId: 'room' });
      socket.emit(event, { meetingId: 'room', userId: 'actor' });
      socket.emit('connect'); mock.timers.tick(500);
      assert.equal(changes, 0);
      cleanups.forEach(cleanup => cleanup?.());
      assert.equal(socket.eventNames().length, 0);
    }
    cleanups = []; changes = 0;
    useRecordingEvents(() => changes++, 'room');
    socket.emit('meeting:participant_left', { meetingId: 'room', userId: 'other-actor' });
    socket.emit('meeting:ended', { meetingId: 'other-room' });
    mock.timers.tick(500); assert.equal(changes, 1);
  } finally {
    cleanups.forEach(cleanup => cleanup?.()); mock.timers.reset(); spies.forEach(spy => spy.mock.restore());
  }
});

test('room lifecycle handles end/kick/leave and competing HTTP/socket completion exactly once', async () => {
  const React = web('react'), storeModule = web('./store/store.ts');
  const snapshots = new Map();
  const replaceModule = (file, exports) => {
    const id = web.resolve(file);
    if (!snapshots.has(id)) snapshots.set(id, web.cache[id]);
    const module = new Module(id); module.filename = id; module.loaded = true; module.exports = exports;
    web.cache[id] = module;
  };
  const spies = [], lifecycleId = web.resolve('./features/meeting/hooks/useMeetingRoomLifecycle.ts');
  let client, handlers, endCallbacks, leaveCallbacks, cleanups = [], info = [], success = [], exits = 0, disconnects = 0;
  spies.push(mock.method(React, 'useCallback', callback => callback), mock.method(React, 'useRef', current => ({ current })),
    mock.method(React, 'useState', initial => [initial, () => {}]),
    mock.method(React, 'useLayoutEffect', effect => { cleanups.push(effect()); }),
    mock.method(storeModule, 'useAppSelector', selector => selector({ auth: { userId: 'actor' } })),
    mock.method(toast, 'info', (...args) => info.push(args)), mock.method(toast, 'success', (...args) => success.push(args)));
  replaceModule('next/navigation', { useRouter: () => ({ replace: () => exits++ }) });
  replaceModule('@livekit/components-react', { useRoomContext: () => ({ disconnect: () => disconnects++ }) });
  replaceModule('@tanstack/react-query', { useQueryClient: () => client });
  replaceModule('./features/meeting/hooks/useMeetingParticipants.ts', {
    useEndMeeting: () => ({ mutate: (_input, callbacks) => { endCallbacks = callbacks; } }),
    useLeaveMeeting: () => ({ mutate: (_input, callbacks) => { leaveCallbacks = callbacks; } }),
  });
  replaceModule('./features/meeting/hooks/useMeetingConfirmDialog.ts', { useMeetingConfirmDialog: () => ({ confirm: async () => true }) });
  replaceModule('./features/meeting/hooks/useMeetingRealtimeCache.ts', { useMeetingRealtimeCache: () => ({}) });
  replaceModule('./features/meeting/hooks/useMeetingSocket.ts', { useMeetingSocket: options => { handlers = options; } });
  delete web.cache[lifecycleId];
  try {
    const { useMeetingRoomLifecycle } = web('./features/meeting/hooks/useMeetingRoomLifecycle.ts');
    for (const scenario of ['participant-end', 'host-socket-first', 'host-http-first', 'removed', 'leave']) {
      client = new QueryClient(); cleanups = []; info = []; success = []; exits = disconnects = 0;
      const controls = useMeetingRoomLifecycle({ meetingId: 'meeting', joinToken: 'lifecycle-room', participantRole: 'PARTICIPANT', initialAutoAdmit: true, initialChatEnabled: true });
      const signal = meetingRoomRequestSignal('/api/meetings/lifecycle-room/recordings/status');
      const ended = { meetingId: 'meeting', endedBy: scenario.startsWith('host') ? 'actor' : 'other-host' };
      handlers.onMeetingEnded({ ...ended, meetingId: 'other-meeting' });
      assert.equal(exits, 0);
      if (scenario.startsWith('host')) {
        await controls.handleEndForEveryone();
        if (scenario === 'host-http-first') endCallbacks.onSuccess();
      }
      if (scenario === 'removed') handlers.onParticipantRemoved({ meetingId: 'meeting', userId: 'actor' });
      else if (scenario === 'leave') { controls.handleLeave(); leaveCallbacks.onSuccess(); }
      else handlers.onMeetingEnded(ended);
      handlers.onMeetingEnded(ended);
      handlers.onParticipantRemoved({ meetingId: 'meeting', userId: 'actor' });
      if (scenario.startsWith('host')) endCallbacks.onSuccess();
      assert.equal(exits, 1, scenario); assert.equal(disconnects, 1, scenario);
      assert.equal(info.length + success.length, scenario === 'leave' ? 0 : 1, scenario);
      assert.equal(signal.aborted, true, scenario);
      cleanups.forEach(cleanup => cleanup?.()); client.clear();
    }
  } finally {
    cleanups.forEach(cleanup => cleanup?.()); client?.clear(); spies.forEach(spy => spy.mock.restore());
    for (const [id, previous] of snapshots) { if (previous) web.cache[id] = previous; else delete web.cache[id]; }
    delete web.cache[lifecycleId];
  }
});

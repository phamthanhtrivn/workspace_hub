import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serviceRequire, webRequire } from './support.mjs';

const tooling = serviceRequire('communication-service');
tooling('ts-node').register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'Node',
    target: 'ES2023',
    esModuleInterop: true,
    jsx: 'react-jsx',
  },
});
tooling('tsconfig-paths').register({
  baseUrl: fileURLToPath(new URL('../../frontend/web/', import.meta.url)),
  paths: { '@/*': ['./*'] },
});
const feature = (path) => webRequire(`./features/meeting/${path}.ts`);
for (const spec of [
  './components/common/user-avatar.spec.tsx',
  './features/meeting/components/history/meeting-history-avatar-stack.spec.tsx',
  './features/meeting/components/room/meeting-prejoin-avatar.spec.tsx',
  './features/meeting/components/room/message/meeting-message-avatar.spec.tsx',
  './features/meeting/utils/meeting-avatar.spec.ts',
]) {
  webRequire(spec);
}
const { scheduleMeetingSchema, createScheduleMeetingSchema } = feature(
  'schemas/schedule-meeting.schema',
);

function schedule() {
  return {
    title: 'Audit meeting',
    scheduledStartAt: new Date(Date.now() + 3600000).toISOString(),
    scheduledEndAt: new Date(Date.now() + 7200000).toISOString(),
    recurrenceRule: null,
    description: '',
    inviteeIds: [],
    password: '',
    requirePassword: false,
    hasExistingPassword: false,
    autoAdmit: false,
    chatEnabled: true,
    autoRecord: false,
    recordingLayout: 'speaker',
    screenShareEnabled: true,
  };
}

test('FRONTEND-01: schedule form rejects blank title, past/reversed/invalid dates and excessive invitees', () => {
  assert.equal(scheduleMeetingSchema.safeParse(schedule()).success, true);
  for (const change of [
    { title: ' ' },
    { scheduledStartAt: 'invalid' },
    { scheduledEndAt: new Date(Date.now() - 1000).toISOString() },
    { scheduledStartAt: new Date(Date.now() - 172800000).toISOString() },
    { inviteeIds: Array(101).fill('member') },
  ]) {
    assert.equal(
      scheduleMeetingSchema.safeParse({ ...schedule(), ...change }).success,
      false,
      JSON.stringify(change),
    );
  }
});

test('FRONTEND-02: password validation allows keeping the existing password when editing', () => {
  assert.equal(
    scheduleMeetingSchema.safeParse({ ...schedule(), requirePassword: true })
      .success,
    false,
  );
  assert.equal(
    scheduleMeetingSchema.safeParse({
      ...schedule(),
      requirePassword: true,
      password: 'audit-secret',
    }).success,
    true,
  );
  assert.equal(
    createScheduleMeetingSchema('edit').safeParse({
      ...schedule(),
      requirePassword: true,
      hasExistingPassword: true,
    }).success,
    true,
  );
});

test('FRONTEND-08: create form rejects a start time earlier today, matching the API contract', (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date(2026, 10, 8, 12).getTime(),
  });
  const values = {
    ...schedule(),
    scheduledStartAt: new Date(Date.now() - 3600000).toISOString(),
  };
  assert.equal(
    scheduleMeetingSchema.safeParse(values).success,
    false,
    'a past clock time on the current day must be rejected',
  );
});

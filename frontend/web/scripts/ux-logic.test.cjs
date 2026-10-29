const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadTypeScript } = require('./lib/load-typescript.cjs');
const source = relative => path.resolve(__dirname, '..', relative);

test('ordinary locations and external meeting-shaped URLs never become Workspace meeting tokens', () => {
  const parser = loadTypeScript(source('features/calendar/utils/calendar-conference.utils.ts'), {}, { window: { location: { origin: 'https://workspace.example.test' } } });
  for (const location of ['Library', 'Room101', 'https://elsewhere.example/meetings/valid_token']) assert.equal(parser.isWorkspaceMeetingUrl(location), false);
  assert.equal(parser.parseCalendarMeetingJoinToken('/meetings/valid_token'), 'valid_token');
});

test('removing a conference hides its old link', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { CalendarConferenceCard } = loadTypeScript(source('features/calendar/components/modal/calendar-conference-card.tsx'), {
    '@/components/ui/button': { Button: ({ variant, size, ...props }) => React.createElement('button', props) },
  });
  const html = renderToStaticMarkup(React.createElement(CalendarConferenceCard, { hasConference: false, locationValue: '/meetings/valid_token', onToggleConference() {} }));
  assert.match(html, /Add Workspace Hub Video Conference/); assert.doesNotMatch(html, /Copy meeting link/);
});

test('reports use account days and handle the DST day without changing session timestamps', () => {
  const report = loadTypeScript(source('features/pomodoro/utils/pomodoro-report.ts'));
  const range = { startDate: '2026-03-08', endDate: '2026-03-08' };
  const now = new Date('2026-03-09T12:00:00Z');
  const bounds = report.reportRangeBounds(range, now, 'America/New_York');
  assert.equal(Date.parse(bounds.endAt) - Date.parse(bounds.startAt), 23 * 60 * 60 * 1000);
  const session = { id: 'one', startedAt: '2026-03-09T03:30:00Z', endedAt: '2026-03-09T03:55:00Z', sessionType: 'FOCUS', status: 'COMPLETED', actualSeconds: 1500 };
  const result = report.buildPomodoroReport([session], range, { source: 'all', project: '', task: '' }, now, 'America/New_York');
  assert.equal(result.daily[0].date, '2026-03-08'); assert.equal(result.daily[0].completedFocusSessions, 1);
  assert.equal(result.sessions[0].startedAt, session.startedAt);
});

test('a failed upload never reports success and retry only submits failed files', async () => {
  const states = [], refs = [], uploads = []; let stateIndex = 0, refIndex = 0, fail = true;
  const { UploadState } = loadTypeScript(source('features/documents/types/documents.enums.ts'));
  const dependencies = {
    react: { useState: initial => { const index = stateIndex++; states[index] = initial; return [initial, value => { states[index] = value; }]; }, useRef: current => { const index = refIndex++; return refs[index] = { current }; }, useEffect() {}, useCallback: fn => fn },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries() {} }), useMutation: options => ({ mutateAsync: async variables => {
      try { const result = await options.mutationFn(variables); options.onSuccess?.(result, variables); return result; }
      catch (error) { options.onError?.(error, variables); throw error; }
    } }) },
    '../api/documents.api': { documentsApi: { getNameConflict: async () => ({ exists: false }), uploadFile: async file => { uploads.push(file.name); if (file.name === 'failed.pdf' && fail) throw new Error('Connection lost'); return {}; } } },
    sonner: { toast: { error() {}, success() {} } },
  };
  const { useDocumentUpload } = loadTypeScript(source('features/documents/hooks/useDocumentUpload.ts'), dependencies, { File: class File {}, setTimeout: () => 1, clearTimeout() {}, console: { error() {} } });
  const uploader = useDocumentUpload({ currentFolderId: null });
  await uploader.uploadFile([{ name: 'good.pdf' }, { name: 'failed.pdf' }]);
  assert.equal(states[0], UploadState.PARTIAL); assert.equal(states[1], 50);
  fail = false; await uploader.retryFailed();
  assert.deepEqual(uploads, ['good.pdf', 'failed.pdf', 'failed.pdf']); assert.equal(states[0], UploadState.SUCCESS);
});

test('Calendar task completion invalidates Dashboard completion statistics', async () => {
  const { QueryClient } = require('@tanstack/react-query');
  const cache = new QueryClient(); const key = ['projects', 'dashboard-completed-tasks', 'user']; cache.setQueryData(key, []);
  const hooks = loadTypeScript(source('features/calendar/hooks/use-calendar-queries.ts'), {
    '@tanstack/react-query': { useQueryClient: () => cache, useMutation: options => options },
    '../api/calendar.api': {}, '@/features/meeting/types/meeting.query-keys': { meetingKeys: {} },
  });
  await hooks.useUpdateCalendarTaskCompletion().onSuccess({ id: 'task' });
  assert.equal(cache.getQueryState(key).isInvalidated, true); cache.clear();
});

test('avatar upload returns a draft; only Save updates the profile cache', async () => {
  const saved = [], cacheWrites = [];
  const hooks = loadTypeScript(source('features/user-setting/hooks/useUserSettingQueries.ts'), {
    '@tanstack/react-query': { useMutation: options => options, useQueryClient: () => ({ setQueryData: (...args) => cacheWrites.push(args), invalidateQueries() {} }) },
    axios: { default: { put: async () => {} } }, '@/store/store': {}, '../utils/theme-preference': {},
    '../api/user-setting.api': { getAvatarPresignedUrl: async () => ({ data: { presignedUrl: 'upload', fileUrl: 'new-avatar' } }), updateUserProfile: async profile => { saved.push(profile); return { data: profile }; } },
  });
  const upload = hooks.useUploadAvatarMutation();
  const draft = await upload.mutationFn({ file: { name: 'avatar.png', type: 'image/png' }, currentProfile: { fullName: 'User', avatarUrl: 'saved-avatar' } });
  assert.equal(draft.data.avatarUrl, 'new-avatar'); assert.equal(saved.length, 0); assert.equal(cacheWrites.length, 0); assert.equal(upload.onSuccess, undefined);
  const save = hooks.useUpdateUserProfileMutation(); const response = await save.mutationFn(draft.data); save.onSuccess(response);
  assert.equal(saved.length, 1); assert.equal(cacheWrites[0][1].data.avatarUrl, 'new-avatar');
});

test('HTTP read responses never decrement an authoritative socket unread count twice', () => {
  const notifications = loadTypeScript(source('store/notification/notification.slice.ts'), {
    '@/features/notification/utils/notification-category.utils': {},
  });
  const reducer = notifications.default;
  let state = reducer(undefined, { type: '@@init' });
  state = reducer(state, notifications.setNotifications({ list: [{ id: 'one', isRead: false }], total: 3, unreadCount: 3 }));
  state = reducer(state, notifications.setUnreadCount(2)); // socket arrives before HTTP
  state = reducer(state, notifications.markReadSuccess('one'));
  state = reducer(state, notifications.markReadSuccess('one'));
  assert.equal(state.unreadCount, 2); assert.equal(state.list[0].isRead, true);
  state = reducer(state, notifications.setNotifications({ list: [{ id: 'one', isRead: true }], total: 3 }));
  assert.equal(state.unreadCount, 2); // list refresh does not own the global badge
  state = reducer(state, notifications.setUnreadCount(1)); // one new notification after READ_ALL
  state = reducer(state, notifications.markAllReadSuccess());
  assert.equal(state.unreadCount, 1);
});

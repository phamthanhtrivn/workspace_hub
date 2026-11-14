const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createSourceLoader, repositoryRoot } = require('../../../../tests/support/typescript.cjs');
const projectRoot = path.join(repositoryRoot, 'frontend/web');
const load = createSourceLoader(projectRoot);
const loadCalendarModule = load;
const { getDateRangeErrors, getDateRangeBounds } = load('lib/date-range.ts');
const base = { mode: 'create', today: '2026-11-11', minDurationMs: 900000 };

test('calendar can allow past starts without changing the default rule for other modules', () => {
  const range = { ...base, start: '2020-01-01T09:00', end: '2020-01-01T10:00' };
  assert.deepEqual(getDateRangeErrors({ ...range, allowPastStart: true }), {});
  assert.ok(getDateRangeErrors(range).start);
  assert.equal(getDateRangeBounds({ ...range, allowPastStart: true }).startMin, undefined);
});

test('task form defaults and task detail use startAt/endAt without separate deadline fields or redundant Tasks row', () => {
  const { createCalendarEventFormDefaults } = loadCalendarModule('features/calendar/utils/calendar-event-form.utils.ts');
  const defaults = createCalendarEventFormDefaults({
    calendarId: 'calendar',
    event: {
      startAt: '2030-01-01T09:00:00Z',
      endAt: '2030-01-01T10:00:00Z',
      description: 'Actual task description',
      sourceType: 'TASK',
    },
  });
  assert.equal(defaults.values.description, 'Actual task description');
  assert.equal('deadlineDate' in defaults.values, false);
  assert.equal('deadlineTime' in defaults.values, false);

  const { renderToStaticMarkup } = require('react-dom/server');
  const { CalendarEventReadonlyDetails } = loadCalendarModule('features/calendar/components/modal/calendar-event-readonly-details.tsx', {
    '@/store/store': { useAppSelector: selector => selector({ auth: { userId: 'owner' } }) },
    '../../hooks/use-calendar-users': { useAttendeeProfiles: () => ({}) },
    './calendar-documents-section': { CalendarDocumentsSection: () => null },
    './event-attendee-list': { EventAttendeeList: () => null },
  });
  const html = renderToStaticMarkup(
    CalendarEventReadonlyDetails({
      event: {
        sourceType: 'TASK',
        description: 'Bring the report',
        documentIds: [],
        attendees: [],
      },
    }),
  );
  assert.match(html, /To do/);
  assert.match(html, /Bring the report/);
  assert.doesNotMatch(html, /Deadline/);
  assert.doesNotMatch(html, />Tasks</);
  assert.doesNotMatch(html, /\[TASK\]|\[Deadline:/);
});

test('calendar tasks group and filter by endAt as the effective deadline', () => {
  const { getTaskDueDate, groupCalendarTasks, filterCalendarTasks } = loadCalendarModule('features/calendar/utils/calendar-tasks.utils.ts');
  const reference = new Date(2026, 10, 12, 12, 0, 0);
  const overdueTask = {
    id: 'overdue-1',
    title: 'Overdue by endAt',
    startAt: new Date(2026, 10, 10, 9, 0, 0).toISOString(),
    endAt: new Date(2026, 10, 11, 17, 0, 0).toISOString(),
    allDay: false,
    completedAt: null,
  };
  const spanningTodayTask = {
    id: 'today-1',
    title: 'Started yesterday but ends today',
    startAt: new Date(2026, 10, 11, 9, 0, 0).toISOString(),
    endAt: new Date(2026, 10, 12, 18, 0, 0).toISOString(),
    allDay: false,
    completedAt: null,
  };
  assert.equal(getTaskDueDate(spanningTodayTask).getDate(), 12);
  const grouped = groupCalendarTasks([overdueTask, spanningTodayTask], reference, { allOverdue: true, allUpcoming: true });
  assert.deepEqual(grouped.overdue.map(t => t.id), ['overdue-1']);
  assert.deepEqual(grouped.today.map(t => t.id), ['today-1']);
  assert.deepEqual(filterCalendarTasks([overdueTask, spanningTodayTask], 'overdue', 'all', reference).map(t => t.id), ['overdue-1']);
  assert.deepEqual(filterCalendarTasks([overdueTask, spanningTodayTask], 'today', 'all', reference).map(t => t.id), ['today-1']);
});

test('repeat summaries capitalize Every and include weekdays, endings and implicit dates', () => {
  const { formatRecurrenceRuleSummary } = loadCalendarModule('features/calendar/utils/calendar-recurrence.utils.ts');
  const weekly = formatRecurrenceRuleSummary('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR;COUNT=10');
  assert.match(weekly, /^Every 2 weeks/);
  assert.match(weekly, /Monday/);
  assert.match(weekly, /Friday/);
  assert.match(weekly, /10 times/);
  assert.match(formatRecurrenceRuleSummary('FREQ=DAILY;UNTIL=20261231T235959Z'), /until December 31, 2026/);
  const context = { startAt: '2026-11-09T18:30:00Z', timeZone: 'Asia/Bangkok' };
  assert.match(formatRecurrenceRuleSummary('FREQ=MONTHLY', context), /10th/);
  assert.match(formatRecurrenceRuleSummary('FREQ=YEARLY', context), /November/);
  assert.doesNotMatch(formatRecurrenceRuleSummary('FREQ=YEARLY;BYDAY=MO', context), /November/);
  assert.match(formatRecurrenceRuleSummary('FREQ=WEEKLY', context), /Tuesday/);
});

test('repeat detail is hidden for non-recurring entries and uses the original occurrence date', () => {
  const { renderToStaticMarkup } = require('react-dom/server');
  const { CalendarEventRecurrenceDetails } = loadCalendarModule('features/calendar/components/modal/calendar-event-recurrence-details.tsx');
  const event = { recurrenceRule: null, originalStartAt: null, startAt: '2026-11-15T09:00:00Z', timeZone: 'UTC' };
  assert.equal(renderToStaticMarkup(CalendarEventRecurrenceDetails({ event })), '');
  const html = renderToStaticMarkup(CalendarEventRecurrenceDetails({ event: { ...event, recurrenceRule: 'FREQ=MONTHLY;COUNT=5', originalStartAt: '2026-11-10T09:00:00Z' } }));
  assert.match(html, /Every month on the 10th for 5 times/);
  assert.match(html, /Repeat:/);
});

test('calendar keeps root and dropdown component identities across parent renders', () => {
  const { Calendar } = loadCalendarModule('components/ui/calendar.tsx', {
    './custom/custom-select': { CustomSelect: () => null },
    '@/components/ui/button': { Button: () => null, buttonVariants: () => '' },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  });
  const first = Calendar({}).props.components;
  const second = Calendar({}).props.components;
  for (const key of ['Root', 'Chevron', 'MonthsDropdown', 'YearsDropdown', 'DayButton']) {
    assert.equal(first[key], second[key], `${key} must not remount on a form update`);
  }
});

test('select ignores empty native sync events but supports explicitly clearing an option', () => {
  const { CustomSelect } = loadCalendarModule('components/ui/custom/custom-select.tsx', {
    '@/components/ui/select': Object.fromEntries(['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'].map(name => [name, () => null])),
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  });
  const changes = [];
  const tree = CustomSelect({ value: '10:00', options: [{ value: '', label: 'Clear' }, { value: '10:00', label: '10:00' }], onChange: value => changes.push(value), ariaLabel: 'End time' });
  const select = tree.props.children.find(child => child?.props?.onValueChange);
  select.props.onValueChange('');
  assert.deepEqual(changes, []);
  select.props.onValueChange('10:00');
  select.props.onValueChange('__CUSTOM_SELECT_EMPTY__');
  assert.deepEqual(changes, ['10:00', '']);
});

test('repeat remains usable when start date is temporarily cleared', () => {
  const { useCalendarRecurrence } = loadCalendarModule('features/calendar/hooks/use-calendar-recurrence.ts', {
    react: { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useMemo: factory => factory() },
  });
  const recurrence = useCalendarRecurrence('', new Date(2026, 10, 10, 9, 45));
  assert.ok(recurrence.recurrenceOptions.some(option => option.value === 'weekly'));
  assert.doesNotThrow(() => recurrence.handleRecurrenceChange('weekly'));
  assert.doesNotThrow(() => recurrence.handleRecurrenceChange('custom'));
});

test('repeated form focus does not update clock state until the event becomes past', () => {
  const realNow = Date.now;
  let currentNow = new Date('2030-01-01T09:00:00').getTime();
  let clockUpdates = 0;
  Date.now = () => currentNow;
  try {
    const { useCalendarEventForm } = loadCalendarModule('features/calendar/hooks/use-calendar-event-form.ts', {
      react: {
        useRef: value => ({ current: value }),
        useCallback: callback => callback,
        useState: initial => {
          let value = typeof initial === 'function' ? initial() : initial;
          return [value, update => {
            const next = typeof update === 'function' ? update(value) : update;
            if (typeof value === 'number' && next !== value) clockUpdates++;
            value = next;
          }];
        },
      },
      'react-hook-form': { useForm: () => ({}) },
      '@tanstack/react-query': { useQueryClient: () => ({}) },
      './use-calendar-event-time': { useCalendarEventTime: () => ({ startAt: '2030-01-01T09:30', refreshToday: () => '2030-01-01' }) },
      './use-calendar-recurrence': { useCalendarRecurrence: () => ({ getRecurrenceRule: () => null }) },
    });
    const controller = useCalendarEventForm({ calendars: [], draft: null, onSubmit: async () => {} });
    for (let minute = 1; minute < 30; minute++) {
      currentNow += 60000;
      controller.refreshToday();
    }
    assert.equal(clockUpdates, 0);
    currentNow += 60000;
    controller.refreshToday();
    assert.equal(clockUpdates, 1);
    controller.refreshToday();
    assert.equal(clockUpdates, 1);
  } finally {
    Date.now = realNow;
  }
});

test('event/task drafts preserve a past date and pass the actual create schema', () => {
  const { createCalendarEventFormDefaults } = loadCalendarModule('features/calendar/utils/calendar-event-form.utils.ts');
  const { createCalendarEventFormSchema } = loadCalendarModule('features/calendar/schemas/calendar-event-form.schema.ts');
  for (const sourceType of ['USER', 'TASK']) {
    const defaults = createCalendarEventFormDefaults({ calendarId: 'calendar', draft: { startAt: new Date(2020, 0, 1, 9), endAt: new Date(2020, 0, 1, 10), sourceType } });
    assert.equal(defaults.values.startAt, '2020-01-01T09:00');
    assert.equal(createCalendarEventFormSchema('create').safeParse({ ...defaults.values, title: 'Past entry' }).success, true);
  }
});

test('start date allows the past, preserves end and rejects dates after end', () => {
  for (const sourceType of ['USER', 'TASK']) {
    const values = { startAt: '2030-01-01T09:00', endAt: '2030-01-01T10:00', allDay: false, sourceType };
    const errors = [];
    const { useCalendarEventTime } = loadCalendarModule('features/calendar/hooks/use-calendar-event-time.ts', {
      'react-hook-form': { useWatch: ({ name }) => values[name] },
      'sonner': { toast: { error: message => errors.push(message) } },
      '@/hooks/use-schedule-today': { useScheduleToday: () => ({ today: '2026-11-11', refreshToday: () => '2026-11-11' }) },
    });
    const form = { control: {}, setValue: (key, value) => { values[key] = value; }, clearErrors: () => {}, trigger: async () => true, setError: (_key, error) => errors.push(error) };
    let hook = useCalendarEventTime(form, 'create');
    hook.handleStartDateChange('2020-01-01');
    assert.equal(values.startAt, '2020-01-01T09:00');
    assert.equal(values.endAt, '2030-01-01T10:00');
    assert.deepEqual(errors, []);
    hook = useCalendarEventTime(form, 'create');
    hook.handleStartDateChange('2040-01-01');
    assert.equal(values.startAt, '2020-01-01T09:00');
    assert.equal(values.endAt, '2030-01-01T10:00');
    assert.ok(errors.length);
    hook = useCalendarEventTime(form, 'create');
    hook.handleEndDateTimeChange('2019-12-31T10:00');
    assert.equal(values.endAt, '2030-01-01T10:00');
    assert.ok(errors.length);
    const bounds = getDateRangeBounds({ ...base, allowPastStart: true, start: values.startAt, end: values.endAt });
    assert.equal(bounds.startMax, '2030-01-01T09:45');
    assert.equal(bounds.endMin, '2020-01-01T09:15');
  }
});

test('changing only start time moves end by the same amount, including across midnight', () => {
  for (const sourceType of ['USER', 'TASK']) {
    const values = { startAt: '2020-01-01T22:00', endAt: '2020-01-01T23:00', allDay: false, sourceType };
    const { useCalendarEventTime } = loadCalendarModule('features/calendar/hooks/use-calendar-event-time.ts', {
      'react-hook-form': { useWatch: ({ name }) => values[name] },
      'sonner': { toast: { error: message => assert.fail(message) } },
      '@/hooks/use-schedule-today': { useScheduleToday: () => ({ today: '2026-11-11', refreshToday: () => '2026-11-11' }) },
    });
    const form = { control: {}, setValue: (key, value) => { values[key] = value; }, clearErrors: () => {}, trigger: async () => true, setError: (_key, error) => assert.fail(error.message) };
    useCalendarEventTime(form, 'create').handleStartTimeChange('23:30');
    assert.equal(values.startAt, '2020-01-01T23:30');
    assert.equal(values.endAt, '2020-01-02T00:30');
  }
});

test('end date can be selected again after it was cleared', () => {
  const values = { startAt: '2026-11-10T09:45', endAt: '', allDay: false };
  const { useCalendarEventTime } = loadCalendarModule('features/calendar/hooks/use-calendar-event-time.ts', {
    'react-hook-form': { useWatch: ({ name }) => values[name] },
    'sonner': { toast: { error: message => assert.fail(message) } },
    '@/hooks/use-schedule-today': { useScheduleToday: () => ({ today: '2026-11-12', refreshToday: () => '2026-11-12' }) },
  });
  const form = { control: {}, setValue: (key, value) => { values[key] = value; }, clearErrors: () => {}, trigger: async () => true, setError: (_key, error) => assert.fail(error.message) };
  useCalendarEventTime(form, 'create').handleEndDateChange('2026-11-12');
  assert.equal(values.endAt, '2026-11-12T10:00');
});

test('allowing past task dates does not permit reversed, invalid or short ranges', () => {
  for (const end of ['2020-01-01T08:59', '2020-01-01T09:14', 'invalid']) {
    assert.ok(getDateRangeErrors({ ...base, allowPastStart: true, start: '2020-01-01T09:00', end }).end);
  }
  assert.deepEqual(getDateRangeErrors({ ...base, allowPastStart: true, start: '2030-01-01T23:55', end: '2030-01-02T00:10' }), {});
});

test('reminder policy compares normalized minutes, permits cross-channel offsets, and Add avoids duplicates', () => {
  const { isDuplicateReminder, nextAvailableReminder } = loadCalendarModule('features/calendar/utils/calendar-reminder-policy.ts');
  const { toReminderMinutes } = loadCalendarModule('features/calendar/utils/calendar-reminder.utils.ts');
  const reminders = [{ method: 'ALERT', minutesBefore: 60 }];
  assert.equal(isDuplicateReminder(reminders, { method: 'ALERT', minutesBefore: toReminderMinutes('1', 'hours') }), true);
  assert.equal(isDuplicateReminder(reminders, { method: 'PUSH', minutesBefore: 60 }), false);
  assert.equal(isDuplicateReminder(reminders, reminders[0], 0), false);
  for (let count = 0; count < 5; count++) {
    const next = nextAvailableReminder(reminders);
    assert.equal(isDuplicateReminder(reminders, next), false);
    reminders.push(next);
  }
});

test('form schema rejects equivalent reminder duplicates at the row while preserving ALERT/PUSH', () => {
  const { calendarEventFormSchema } = loadCalendarModule('features/calendar/schemas/calendar-event-form.schema.ts');
  const { createCalendarEventFormDefaults } = loadCalendarModule('features/calendar/utils/calendar-event-form.utils.ts');
  const values = createCalendarEventFormDefaults({ calendarId: 'calendar', draft: { startAt: new Date('2030-01-01T09:00:00'), endAt: new Date('2030-01-01T10:00:00') } }).values;
  values.title = 'Reminder test';
  values.reminders = [{ method: 'ALERT', minutesBefore: 60 }, { method: 'ALERT', minutesBefore: 60 }];
  const duplicate = calendarEventFormSchema.safeParse(values);
  assert.equal(duplicate.success, false);
  assert.ok(duplicate.error.issues.some(issue => issue.path.join('.') === 'reminders.1.minutesBefore'));
  values.reminders[1].method = 'PUSH';
  assert.equal(calendarEventFormSchema.safeParse(values).success, true);
});

test('only live PUSH signals alert once, including an ALERT-to-PUSH upgrade and background consumption', () => {
  const { consumeCalendarPush } = loadCalendarModule('features/notification/utils/calendar-reminder-alert.ts');
  const notification = { id: 'notification', recipientId: 'user', type: 'CALENDAR_REMINDER', metadata: { groupKey: 'group', method: 'ALERT' } };
  const seen = new Set();
  assert.equal(consumeCalendarPush(notification, seen, true, true), false);
  notification.metadata = { ...notification.metadata, method: 'PUSH', channels: ['ALERT', 'PUSH'] };
  assert.equal(consumeCalendarPush(notification, seen, true, true), true);
  assert.equal(consumeCalendarPush(notification, seen, true, true), false);
  notification.metadata.groupKey = 'background';
  assert.equal(consumeCalendarPush(notification, seen, false, false), false);
  assert.equal(consumeCalendarPush(notification, seen, true, true), false);
  notification.metadata.groupKey = 'other-window';
  assert.equal(consumeCalendarPush(notification, seen, true, false), false);
  assert.equal(consumeCalendarPush({ ...notification, type: 'PROJECT_TASK_UPDATED' }, new Set(), true, true), false);
});

test('Calendar PUSH manager keeps muted toasts, plays sound once when enabled, and opens the exact event', () => {
  const oldWindow = global.window, oldDocument = global.document;
  const { NOTIFICATION_RECEIVED_EVENT } = loadCalendarModule('features/notification/utils/notification-category.utils.ts');
  try {
    for (const soundEnabled of [true, false]) {
      const target = new EventTarget(), toasts = [], routes = [];
      let sounds = 0, cleanup;
      global.window = target;
      global.document = { visibilityState: 'visible', hasFocus: () => true };
      const { default: Manager } = loadCalendarModule('features/notification/components/calendar-reminder-alert-manager.tsx', {
        react: { ...require('react'), useRef: value => ({ current: value }), useEffect: effect => { cleanup = effect(); } },
        'next/navigation': { useRouter: () => ({ push: route => routes.push(route) }) },
        sonner: { toast: { info: (title, options) => toasts.push({ title, options }) } },
        '@/features/user-setting/hooks/useNotificationAlertPreference': { useNotificationAlertPreference: () => soundEnabled },
        '@/store/store': { useAppSelector: selector => selector({ auth: { userId: 'user' } }) },
        '../utils/notification-alert.utils': { playNotificationSound: () => { sounds++; } },
      });
      Manager();
      const signal = { id: 'bell', recipientId: 'user', type: 'CALENDAR_REMINDER', content: 'Starts at 10:00', metadata: { eventId: 'event', eventTitle: 'Test task', groupKey: 'group', method: 'ALERT' } };
      const send = () => target.dispatchEvent(new CustomEvent(NOTIFICATION_RECEIVED_EVENT, { detail: signal }));
      send(); assert.equal(toasts.length, 0); assert.equal(sounds, 0);
      signal.metadata.method = 'PUSH';
      send(); send();
      assert.equal(toasts.length, 1); assert.equal(sounds, soundEnabled ? 1 : 0);
      assert.equal(toasts[0].title, 'Test task');
      toasts[0].options.action.onClick(); assert.deepEqual(routes, ['/calendar?eventId=event']);
      cleanup();
    }
  } finally {
    if (oldWindow === undefined) delete global.window; else global.window = oldWindow;
    if (oldDocument === undefined) delete global.document; else global.document = oldDocument;
  }
});

test('autoplay rejection is caught by the shared notification sound helper', async () => {
  const oldAudio = global.Audio, oldWarn = console.warn;
  let warnings = 0;
  try {
    global.Audio = class { play() { return Promise.reject(new Error('autoplay blocked')); } };
    console.warn = () => { warnings++; };
    const { playNotificationSound } = loadCalendarModule('features/notification/utils/notification-alert.utils.ts');
    assert.doesNotThrow(playNotificationSound);
    await Promise.resolve();
    assert.equal(warnings, 1);
  } finally {
    if (oldAudio === undefined) delete global.Audio; else global.Audio = oldAudio;
    console.warn = oldWarn;
  }
});

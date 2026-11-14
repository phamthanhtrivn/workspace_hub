const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { buildCalendarReminderEmail } = require('./templates/calendar-reminder.template');
const { parseCalendarReminder } = require('./events/calendar-reminder.payload');
const { CalendarReminderEmailService, isDefiniteEmailFailure } = require('./calendar-reminder-email.service');
const { CalendarReminderEvent } = require('./events/calendar-reminder.event');

const { payload } = require('../../../tests/fixtures/calendar-reminder.cjs');

test('payload accepts legacy messages and validates optional reminder context', () => {
  const legacy = payload(); delete legacy.groupKey;
  assert.equal(parseCalendarReminder(legacy).deliveryId, legacy.deliveryId);
  for (const patch of [{ minutesBefore: -1 }, { groupKey: 'bad' }, { scheduledAt: 'invalid' }]) assert.throws(() => parseCalendarReminder(payload('ALERT', patch)));
  for (const patch of [{ timeZone: 'invalid' }, { allDay: 'yes' }, { endAt: 'invalid' }]) {
    const current = payload(); Object.assign(current.event, patch);
    assert.throws(() => parseCalendarReminder(current));
  }
});

const templateInput = {
  recipientEmail: 'test@example.invalid', recipientName: 'Trí <script>', eventTitle: 'Đề tài <b>mới</b>', sourceType: 'TASK',
  startAt: '2030-01-01T03:00:00Z', endAt: '2030-01-01T04:00:00Z', timeZone: 'Asia/Bangkok', calendarName: 'Cá nhân',
  minutesBefore: 60, location: 'Phòng A & B', description: 'Dòng một\nDòng hai <img src=x>\n' + 'TiếngViệt'.repeat(200),
  eventUrl: 'https://workspace.example/calendar?eventId=test&source=email',
};
test('email renders complete escaped Vietnamese content with explicit calendar timezone and text alternative', () => {
  const message = buildCalendarReminderEmail(templateInput);
  assert.match(message.subject, /^Task reminder:/);
  for (const expected of ['Cá nhân', 'Asia/Bangkok', '1 hour before start', '10:00 AM', '11:00 AM']) assert.ok(message.text.includes(expected), expected);
  assert.ok(message.text.includes(templateInput.description));
  assert.match(message.html, /Trí &lt;script&gt;/);
  assert.match(message.html, /Dòng một<br>Dòng hai &lt;img/);
  assert.ok(!message.html.includes('<img src=x>'));
  assert.ok(!message.html.includes('<b>mới</b>'));
  assert.match(message.html, /max-width:600px/);
  assert.match(message.html, /#22396f/);
});
test('all-day exclusive ends, multi-day ranges, UTC fallback and empty fields', () => {
  const single = buildCalendarReminderEmail({ ...templateInput, allDay: true, startAt: '2030-01-01T00:00:00Z', endAt: '2030-01-02T00:00:00Z', timeZone: 'UTC', description: '', location: '' });
  assert.ok(single.text.includes('January 1, 2030 · All day'));
  assert.ok(!single.text.includes('January 2'));
  assert.ok(!single.text.includes('Description'));
  const multiple = buildCalendarReminderEmail({ ...templateInput, allDay: true, startAt: '2030-01-01T00:00:00Z', endAt: '2030-01-04T00:00:00Z', timeZone: 'UTC' });
  assert.ok(multiple.text.includes('January 3, 2030'));
  const fallback = buildCalendarReminderEmail({ recipientEmail: 'test@example.invalid', eventTitle: 'Legacy', startAt: '2030-01-01T03:00:00Z', eventUrl: templateInput.eventUrl });
  assert.match(fallback.text, /Time zone: UTC/);
  assert.ok(!fallback.text.includes('undefined'));
});
test('SMTP classification retries definite rejections and never retries uncertain DATA outcomes', () => {
  assert.equal(isDefiniteEmailFailure({ responseCode: 450 }), true);
  assert.equal(isDefiniteEmailFailure({ code: 'ECONNECTION' }), true);
  assert.equal(isDefiniteEmailFailure({ code: 'ETIMEDOUT', command: 'CONN' }), true);
  assert.equal(isDefiniteEmailFailure({ code: 'ETIMEDOUT', command: 'DATA' }), false);
  assert.equal(isDefiniteEmailFailure({ code: 'ECONNRESET', command: 'DATA' }), false);
});

test('SMTP acceptance is required before the email is considered sent', async () => {
  const { EmailService } = require('./email.service');
  const email = new EmailService();
  await assert.doesNotReject(email.sendPreparedCalendarReminder({ mail: {}, transporter: { sendMail: async () => ({ accepted: ['test@example.invalid'] }) } }));
  await assert.rejects(email.sendPreparedCalendarReminder({ mail: {}, transporter: { sendMail: async () => ({ accepted: [], rejected: ['test@example.invalid'] }) } }), error => error.code === 'EENVELOPE');
  await assert.rejects(email.sendPreparedCalendarReminder({ mail: {}, transporter: { sendMail: async () => { throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT', command: 'DATA' }); } } }), error => error.command === 'DATA');
});
test('recipient failure does not prevent processing remaining recipients', async () => {
  const input = payload(); input.recipients.push({ userId: randomUUID(), email: 'second@example.invalid' });
  const seen = [];
  const controller = new CalendarReminderEvent({}, { deliver: async (_payload, recipient) => { seen.push(recipient.userId); if (seen.length === 1) throw new Error('dependency'); } });
  await assert.rejects(controller.handle(input));
  assert.equal(seen.length, 2);
});


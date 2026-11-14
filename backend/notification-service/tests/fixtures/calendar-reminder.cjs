const { randomUUID, createHash } = require('node:crypto');
function payload(method = 'EMAIL', extra = {}) {
  return {
    eventType: 'CALENDAR_REMINDER_DUE', deliveryId: randomUUID(), groupKey: createHash('sha256').update(randomUUID()).digest('hex'), method,
    minutesBefore: 10,
    event: { id: randomUUID(), title: 'Thảo luận luận văn', startAt: '2030-01-01T03:00:00Z', endAt: '2030-01-01T04:00:00Z', timeZone: 'Asia/Bangkok' },
    recipients: [{ userId: randomUUID(), email: 'test@example.invalid' }], ...extra,
  };
}

module.exports = { payload };

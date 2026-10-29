const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ quiet: true });

async function main() {
  const prisma = new PrismaClient();
  try {
    const serviceUrl = process.env.COMMUNICATION_SERVICE_URL, key = process.env.INTERNAL_SERVICE_KEY;
    if (!serviceUrl || !key) throw new Error('Configure COMMUNICATION_SERVICE_URL and INTERNAL_SERVICE_KEY first');
    const events = await prisma.calendarEvent.findMany({ select: { id: true, createdBy: true, calendarId: true, recurrenceSeriesId: true, location: true, startAt: true, endAt: true } });
    const report = { mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', verified: [], unresolved: [] };
    const adopted = new Set();
    for (const event of events) {
      if (!event.location) continue;
      let token;
      // Raw legacy tokens are considered only after verifying the real meeting,
      // its owner and the exact occurrence time. Ordinary locations are untouched.
      if (/^[A-Za-z0-9_-]{11}$/.test(event.location)) token = event.location;
      else {
        try {
          const url = new URL(event.location, process.env.FRONTEND_URL);
          if (process.env.FRONTEND_URL && url.origin !== new URL(process.env.FRONTEND_URL).origin) continue;
          token = url.pathname.match(/^\/meetings\/([A-Za-z0-9_-]+)\/?$/)?.[1];
        } catch { continue; }
      }
      if (!token || adopted.has(token)) continue;
      const response = await fetch(`${serviceUrl}/api/meetings/internal/calendar-source/${encodeURIComponent(token)}`, { headers: { 'x-internal-service-key': key }, signal: AbortSignal.timeout(10000), redirect: 'error' });
      if (!response.ok) throw new Error('Unable to verify legacy meetings');
      const { data: meeting } = await response.json();
      if (!meeting) continue;
      if (meeting.createdBy !== event.createdBy || Date.parse(meeting.scheduledStartAt) !== event.startAt.getTime() || (meeting.calendarEventId && meeting.calendarEventId !== event.id)) {
        report.unresolved.push({ eventId: event.id, reason: 'Owner, occurrence time, or existing binding does not match' }); continue;
      }
      adopted.add(token); report.verified.push({ eventId: event.id, meetingId: meeting.id });
      if (report.mode === 'apply') await prisma.$transaction(async tx => {
        const targets = event.recurrenceSeriesId ? { recurrenceSeriesId: event.recurrenceSeriesId, location: event.location } : { id: event.id };
        await tx.calendarEvent.updateMany({ where: targets, data: { conferenceEnabled: true, location: null } });
        if (event.recurrenceSeriesId) await tx.recurrenceSeries.updateMany({ where: { id: event.recurrenceSeriesId, location: event.location }, data: { conferenceEnabled: true, location: null } });
        await tx.calendarConference.upsert({ where: { eventId: event.id }, create: {
          eventId: event.id, calendarId: event.calendarId, hostId: event.createdBy, enabled: true,
          signature: 'legacy', payload: { adoptJoinToken: token },
        }, update: {} });
      });
    }
    console.log(JSON.stringify(report, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

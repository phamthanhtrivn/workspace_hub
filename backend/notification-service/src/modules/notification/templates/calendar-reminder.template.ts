export interface CalendarReminderEmailInput {
  recipientEmail: string;
  recipientName?: string | null;
  eventTitle: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  sourceType?: string;
  calendarName?: string;
  timeZone?: string;
  minutesBefore?: number;
  location?: string | null;
  description?: string | null;
  eventUrl: string;
}

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildCalendarReminderEmail(input: CalendarReminderEmailInput) {
  const kind = input.sourceType === 'TASK' ? 'Task' : 'Event';
  let timeZone = input.timeZone ?? 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    timeZone = 'UTC';
  }
  const start = new Date(input.startAt);
  const end = input.endAt ? new Date(input.endAt) : undefined;
  const date = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeZone,
  });
  const dateTime = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  });
  const details: Array<[string, string]> = [];
  if (input.calendarName) details.push(['Calendar', input.calendarName]);
  if (input.allDay) {
    // End is exclusive; subtract an instant rather than 24 hours (DST-safe).
    const lastDay = end && end > start ? new Date(end.getTime() - 1) : start;
    const range =
      date.format(start) === date.format(lastDay)
        ? date.format(start)
        : `${date.format(start)} – ${date.format(lastDay)}`;
    details.push(['When', `${range} · All day`]);
  } else {
    details.push(['Starts', dateTime.format(start)]);
    if (end) details.push(['Ends', dateTime.format(end)]);
  }
  details.push(['Time zone', timeZone]);
  if (input.minutesBefore !== undefined) {
    const minutes = input.minutesBefore;
    const unit =
      minutes > 0 && minutes % 10080 === 0
        ? (['week', minutes / 10080] as const)
        : minutes > 0 && minutes % 1440 === 0
          ? (['day', minutes / 1440] as const)
          : minutes > 0 && minutes % 60 === 0
            ? (['hour', minutes / 60] as const)
            : (['minute', minutes] as const);
    details.push([
      'Reminder',
      minutes === 0
        ? 'At start'
        : `${unit[1]} ${unit[0]}${unit[1] === 1 ? '' : 's'} before start`,
    ]);
  }
  if (input.location?.trim()) details.push(['Location', input.location]);
  const greeting = `Hello ${input.recipientName?.trim() || 'there'},`;
  const preheader = `${kind} reminder: ${input.eventTitle} · ${input.allDay ? date.format(start) : dateTime.format(start)} (${timeZone})`;
  const e = escapeEmailHtml;
  const rows = details
    .map(
      ([label, value]) =>
        `<tr><th align="left" valign="top" style="width:100px;padding:8px 16px 8px 0;font-size:13px;font-weight:400;color:#595959;">${e(label)}</th><td style="padding:8px 0;font-size:14px;color:#1f2937;overflow-wrap:anywhere;word-break:break-word;">${e(value)}</td></tr>`,
    )
    .join('');
  const description = input.description?.trim()
    ? `<div style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e5e7eb;"><h2 style="font-size:14px;margin:0 0 8px;">Description</h2><p style="margin:0;overflow-wrap:anywhere;word-break:break-word;">${e(input.description).replace(/\r?\n/g, '<br>')}</p></div>`
    : '';

  return {
    subject: `${kind} reminder: ${input.eventTitle}`,
    text: [
      greeting,
      '',
      `${kind} reminder: ${input.eventTitle}`,
      '',
      ...details.map(([label, value]) => `${label}: ${value}`),
      ...(input.description?.trim()
        ? ['', 'Description', input.description]
        : []),
      '',
      `Open ${kind.toLowerCase()}: ${input.eventUrl}`,
      '',
      'WorkspaceHub · Calendar reminders',
    ].join('\n'),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(kind)} reminder</title></head><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;"><tr><td style="padding:0 8px 20px;font-size:18px;font-weight:700;color:#22396f;">WorkspaceHub</td></tr>
<tr><td style="background:#ffffff;padding:28px 24px;border-radius:12px;">
<p style="margin:0 0 12px;color:#595959;">${e(greeting)}</p>
<h1 style="font-size:22px;line-height:1.35;margin:0 0 8px;overflow-wrap:anywhere;word-break:break-word;">${e(input.eventTitle)}</h1>
<p style="margin:0 0 20px;color:#595959;">${kind} reminder</p>
<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows}</table>${description}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;"><tr><td bgcolor="#22396f" style="border-radius:8px;"><a href="${e(input.eventUrl)}" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-weight:600;">Open ${kind.toLowerCase()}</a></td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#595959;overflow-wrap:anywhere;word-break:break-word;">If the button does not work, <a href="${e(input.eventUrl)}" style="color:#22396f;">open this reminder in WorkspaceHub</a>.</p>
</td></tr><tr><td style="padding:20px 8px;font-size:12px;color:#595959;">WorkspaceHub · Calendar reminders<br>You received this email because an email reminder was configured for this ${kind.toLowerCase()}.</td></tr></table>
</td></tr></table></body></html>`,
  };
}

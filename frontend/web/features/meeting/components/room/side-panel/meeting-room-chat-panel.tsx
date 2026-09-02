"use client";

import { useAppIntl } from "@/features/i18n/useAppIntl";

export function MeetingRoomChatPanel() {
  const intl = useAppIntl();

  return (
    <div className="mt-4 flex h-[calc(100%-3.5rem)] flex-col rounded-lg bg-white/6 p-4 ring-1 ring-white/8">
      <div className="flex flex-1 items-center justify-center text-center text-sm font-semibold leading-6 text-slate-400">
        <span>{intl.formatMessage({ id: "meeting.room.panel.chatEmpty" })}</span>
      </div>
      <div className="flex h-11 items-center rounded-lg border border-white/10 bg-black/20 px-3 text-sm font-semibold text-slate-500">
        {intl.formatMessage({ id: "meeting.room.panel.chatInput" })}
      </div>
    </div>
  );
}

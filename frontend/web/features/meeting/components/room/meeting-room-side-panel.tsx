"use client";

import { X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingRoomPanel } from "../../types/meeting.types";
import { MeetingParticipantsPanel } from "./meeting-participants-panel";

interface MeetingRoomSidePanelProps {
  activePanel: MeetingRoomPanel;
  participantCount: number;
  onClose: () => void;
}

function getPanelTitleLabelId(activePanel: MeetingRoomPanel) {
  if (activePanel === MeetingRoomPanel.PARTICIPANTS) {
    return "meeting.room.panel.participants";
  }

  if (activePanel === MeetingRoomPanel.CHAT) {
    return "meeting.room.panel.chat";
  }

  return "meeting.room.panel.settings";
}

function MeetingRoomPanelContent({
  activePanel,
  participantCount,
}: Pick<MeetingRoomSidePanelProps, "activePanel" | "participantCount">) {
  const intl = useAppIntl();

  if (activePanel === MeetingRoomPanel.PARTICIPANTS) {
    return <MeetingParticipantsPanel />;
  }

  if (activePanel === MeetingRoomPanel.CHAT) {
    return (
      <div className="mt-4 flex h-[calc(100%-3.5rem)] flex-col rounded-lg bg-white/6 p-4 ring-1 ring-white/8">
        <div className="flex flex-1 items-center justify-center text-center text-sm font-semibold leading-6 text-slate-400">
          <span>
            {intl.formatMessage({ id: "meeting.room.panel.chatEmpty" })}
          </span>
        </div>
        <div className="flex h-11 items-center rounded-lg border border-white/10 bg-black/20 px-3 text-sm font-semibold text-slate-500">
          {intl.formatMessage({ id: "meeting.room.panel.chatInput" })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-lg bg-white/6 p-4 ring-1 ring-white/8">
        <p className="text-sm font-black text-slate-100">
          {intl.formatMessage({
            id: "meeting.room.panel.autoAdminTitle",
          })}
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
          {intl.formatMessage(
            {
              id: "meeting.room.panel.autoAdminDescription",
            },
            { count: participantCount },
          )}
        </p>
      </div>
    </div>
  );
}

export function MeetingRoomDesktopSidePanel({
  activePanel,
  participantCount,
  onClose,
}: MeetingRoomSidePanelProps) {
  const intl = useAppIntl();

  if (activePanel === MeetingRoomPanel.NONE) return null;

  return (
    <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-[#0d1420] p-4 lg:block">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">
          {intl.formatMessage({ id: getPanelTitleLabelId(activePanel) })}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={intl.formatMessage({ id: "app.close" })}
          className="grid h-9 w-9 place-items-center rounded-lg bg-white/8 text-slate-300 transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <MeetingRoomPanelContent
        activePanel={activePanel}
        participantCount={participantCount}
      />
    </aside>
  );
}

export function MeetingRoomMobilePanelHeader({
  activePanel,
  onClose,
}: Pick<MeetingRoomSidePanelProps, "activePanel" | "onClose">) {
  const intl = useAppIntl();

  if (activePanel === MeetingRoomPanel.NONE) return null;

  return (
    <div className="border-t border-white/10 bg-[#0d1420] p-3 lg:hidden">
      <div className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-2 text-sm font-black text-slate-200 ring-1 ring-white/8">
        <span>{intl.formatMessage({ id: getPanelTitleLabelId(activePanel) })}</span>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-md bg-white/8"
          aria-label={intl.formatMessage({ id: "app.close" })}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import { useMeetingClock, useMeetingSocket, useMeetingsQuery } from "../hooks";
import { MeetingSidebar } from "./sidebar/meeting-sidebar";
import { MeetingHero } from "./common/meeting-hero";
import { MeetingDashboardActionId, meetingDashboardActions } from "../types";
import { MeetingActionTile } from "./common/meeting-action-tile";
import { InstantMeetingModal } from "./instant/instant-meeting-modal";
import { isMeetingHost } from "../utils/meeting.utils";

export function MeetingPage() {
  const intl = useAppIntl();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const meetingsQuery = useMeetingsQuery();
  const meetings = useMemo(
    () => meetingsQuery.data?.data ?? [],
    [meetingsQuery.data?.data],
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const firstHostMeeting = useMemo(
    () => meetings.find((meeting) => isMeetingHost(meeting, currentUserId)),
    [currentUserId, meetings],
  );

  useMeetingSocket(firstHostMeeting?.id);
  const clock = useMeetingClock();

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f5f9fb] text-[#172B4D] xl:flex-row">
      <MeetingSidebar />

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5">
          <MeetingHero
            dateLabel={clock.dateLabel}
            timeLabel={clock.timeLabel}
            liveMeetingCount={meetings.length}
          />

          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label={intl.formatMessage({
              id: "meeting.dashboard.actionsLabel",
            })}
          >
            {meetingDashboardActions.map((action) => (
              <MeetingActionTile
                key={action.id}
                actionId={action.id}
                titleId={action.titleId}
                descriptionId={action.descriptionId}
                tone={action.tone}
                enabled={action.enabled}
                onClick={
                  action.id === MeetingDashboardActionId.NEW_MEETING
                    ? () => setIsCreateOpen(true)
                    : undefined
                }
              />
            ))}
          </section>

        </div>
      </section>

      <InstantMeetingModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}

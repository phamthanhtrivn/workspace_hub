"use client";

import { useAppIntl } from "@/features/i18n/useAppIntl";
import { MeetingHero } from "./common/meeting-hero";
import { MeetingActionTile } from "./common/meeting-action-tile";
import { meetingDashboardActions } from "../types/meeting.constants";
import { MeetingSidebar } from "./meeting-sidebar";
import { useMeetingClock } from "../hooks/useMeetingClock";

export function MeetingLayout() {
  const intl = useAppIntl();
  const clock = useMeetingClock();

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f5f9fb] text-[#172B4D] xl:flex-row">
      <MeetingSidebar />

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5">
          <MeetingHero
            dateLabel={clock.dateLabel}
            timeLabel={clock.timeLabel}
            liveMeetingCount={2}
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
              />
            ))}
          </section>

        </div>
      </section>
    </div>
  );
}

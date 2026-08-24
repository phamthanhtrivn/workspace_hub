"use client";

import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Radio,
  Sparkles,
  Video,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

const previewItems = [
  {
    titleId: "meeting.instant.title",
    descriptionId: "meeting.instant.description",
    icon: Video,
  },
  {
    titleId: "meeting.scheduled.title",
    descriptionId: "meeting.scheduled.description",
    icon: CalendarClock,
  },
  {
    titleId: "meeting.recent.title",
    descriptionId: "meeting.recent.description",
    icon: Clock3,
  },
];

const nextSteps = [
  "meeting.next.tokenEndpoint",
  "meeting.next.roomCreation",
  "meeting.next.reactRoom",
];

export default function MeetingHub() {
  const intl = useAppIntl();
  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const isLiveKitConfigured = Boolean(liveKitUrl);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f5f9fb] lg:flex-row">
      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-secondary)]">
              <Radio className="h-4 w-4" />
              <span>{intl.formatMessage({ id: "meeting.statusLine" })}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-[var(--color-primary-dark)] sm:text-3xl">
              {intl.formatMessage({ id: "meeting.title" })}
            </h1>
          </div>

          <button
            type="button"
            disabled
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 text-sm font-black text-white opacity-55 shadow-[0_14px_28px_rgba(15,40,84,0.18)]"
          >
            <Video className="h-4 w-4" />
            <span>{intl.formatMessage({ id: "meeting.newMeeting" })}</span>
          </button>
        </div>

        <div className="grid flex-1 gap-5 py-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-black text-slate-900 sm:text-2xl">
                    {intl.formatMessage({ id: "meeting.preparingTitle" })}
                  </h2>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                    {intl.formatMessage({
                      id: "meeting.preparingDescription",
                    })}
                  </p>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {intl.formatMessage({ id: "meeting.foundationReady" })}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {intl.formatMessage({ id: "meeting.foundationScope" })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {previewItems.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.titleId}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-50 text-[var(--color-primary)] ring-1 ring-slate-200">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-slate-500">
                        {intl.formatMessage({ id: "meeting.comingSoon" })}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-black text-slate-900">
                      {intl.formatMessage({ id: item.titleId })}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                      {intl.formatMessage({ id: item.descriptionId })}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:hidden">
            <MeetingSidePanel
              liveKitUrl={liveKitUrl}
              isLiveKitConfigured={isLiveKitConfigured}
            />
          </aside>
        </div>
      </section>

      <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] xl:block">
        <MeetingSidePanel
          liveKitUrl={liveKitUrl}
          isLiveKitConfigured={isLiveKitConfigured}
        />
      </aside>
    </div>
  );
}

function MeetingSidePanel({
  liveKitUrl,
  isLiveKitConfigured,
}: {
  liveKitUrl: string | undefined;
  isLiveKitConfigured: boolean;
}) {
  const intl = useAppIntl();

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          {intl.formatMessage({ id: "meeting.today" })}
        </p>
        <div className="mt-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-sm font-black text-slate-900">
            {intl.formatMessage({ id: "meeting.noMeetingsToday" })}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {intl.formatMessage({ id: "meeting.noMeetingsTodayDescription" })}
          </p>
        </div>
      </section>

      <section>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          {intl.formatMessage({ id: "meeting.livekitStatus" })}
        </p>
        <div className="mt-3 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <span
              className={
                isLiveKitConfigured
                  ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
                  : "h-2.5 w-2.5 rounded-full bg-slate-300"
              }
            />
            <p className="text-sm font-black text-slate-900">
              {intl.formatMessage({
                id: isLiveKitConfigured
                  ? "meeting.livekitConfigured"
                  : "meeting.livekitNotConfigured",
              })}
            </p>
          </div>
          <p className="mt-3 break-all rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
            {liveKitUrl ??
              intl.formatMessage({ id: "meeting.notConfiguredValue" })}
          </p>
        </div>
      </section>

      <section>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          {intl.formatMessage({ id: "meeting.whatsNext" })}
        </p>
        <div className="mt-3 space-y-2">
          {nextSteps.map((stepId) => (
            <div
              key={stepId}
              className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3"
            >
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
              <p className="text-sm font-semibold leading-5 text-slate-600">
                {intl.formatMessage({ id: stepId })}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


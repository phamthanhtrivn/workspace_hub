"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Mic,
  MicOff,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import { cn } from "@/lib/utils";
import {
  meetingMockParticipants,
  meetingRoomControlItems,
} from "../../types/meeting.constants";
import { MeetingRoomPanel } from "../../types/meeting.types";
import { MeetingRoomControlButton } from "../common/meeting-room-control-button";

interface MeetingRoomShellProps {
  joinToken: string;
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function MeetingRoomShell({ joinToken }: MeetingRoomShellProps) {
  const intl = useAppIntl();
  const router = useRouter();
  const authUser = useAppSelector((state) => state.auth);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [activePanel, setActivePanel] = useState(MeetingRoomPanel.NONE);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const displayName =
    authUser.fullName || authUser.email || intl.formatMessage({ id: "chat.you" });

  const participants = useMemo(
    () =>
      meetingMockParticipants.map((participant) =>
        participant.id === "local-user"
          ? {
              ...participant,
              name: displayName,
            }
          : {
              ...participant,
              name: intl.formatMessage({ id: participant.nameId }),
            },
      ),
    [displayName, intl],
  );

  const handleLeave = () => {
    window.close();
    window.setTimeout(() => {
      router.push("/meetings");
    }, 160);
  };

  return (
    <div className="fixed inset-0 z-[90] flex min-h-[100dvh] flex-col overflow-hidden bg-[#070b12] text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0d1420]/95 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0052CC] shadow-[0_12px_28px_rgba(0,82,204,0.28)]">
            <Video className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-black sm:text-base">
              {intl.formatMessage({ id: "meeting.room.title" })}
            </h1>
            <p className="truncate text-xs font-semibold text-slate-400">
              {intl.formatMessage(
                { id: "meeting.room.token" },
                { token: joinToken },
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-md bg-emerald-500/12 px-3 py-1.5 text-xs font-black text-emerald-200 ring-1 ring-emerald-300/15 sm:inline-flex">
            {intl.formatMessage({ id: "meeting.room.statusConnected" })}
          </span>
          <span className="rounded-md bg-white/8 px-3 py-1.5 text-xs font-black text-slate-100 ring-1 ring-white/10">
            {formatElapsedTime(elapsedSeconds)}
          </span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div
            className={cn(
              "grid min-h-full gap-4",
              activePanel === MeetingRoomPanel.NONE
                ? "lg:grid-cols-3"
                : "lg:grid-cols-2",
            )}
          >
            {participants.map((participant, index) => {
              const isLocalUser = participant.id === "local-user";
              const isCameraVisible = isLocalUser ? cameraEnabled : index !== 1;

              return (
                <article
                  key={participant.id}
                  className={cn(
                    "relative flex min-h-[220px] overflow-hidden rounded-lg border border-white/10 bg-[#121a28] shadow-[0_18px_48px_rgba(0,0,0,0.24)]",
                    isLocalUser && activePanel === MeetingRoomPanel.NONE
                      ? "lg:col-span-2 lg:row-span-2"
                      : "",
                  )}
                >
                  {isCameraVisible ? (
                    <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,#304260,transparent_42%),linear-gradient(135deg,#152033,#0b111d)]">
                      <span className="grid h-24 w-24 place-items-center rounded-full bg-white/12 text-3xl font-black text-white ring-1 ring-white/14">
                        {participant.initials}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#0c121d] text-center">
                      <span className="grid h-20 w-20 place-items-center rounded-full bg-white/8 text-slate-300 ring-1 ring-white/10">
                        <VideoOff className="h-8 w-8" />
                      </span>
                      <p className="text-sm font-bold text-slate-300">
                        {intl.formatMessage({ id: "meeting.room.cameraPaused" })}
                      </p>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 rounded-md bg-black/45 px-3 py-2 backdrop-blur">
                      <p className="truncate text-sm font-black">
                        {participant.name}
                      </p>
                      <p className="text-xs font-semibold text-slate-300">
                        {intl.formatMessage({ id: participant.roleId })}
                      </p>
                    </div>
                    {isLocalUser ? (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-black/45 text-white backdrop-blur">
                        {microphoneEnabled ? (
                          <Mic className="h-4 w-4" />
                        ) : (
                          <MicOff className="h-4 w-4 text-red-300" />
                        )}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {activePanel !== MeetingRoomPanel.NONE ? (
          <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-[#0d1420] p-4 lg:block">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black">
                {intl.formatMessage({
                id:
                    activePanel === MeetingRoomPanel.PARTICIPANTS
                      ? "meeting.room.panel.participants"
                      : activePanel === MeetingRoomPanel.CHAT
                        ? "meeting.room.panel.chat"
                        : "meeting.room.panel.settings",
                })}
              </h2>
              <button
                type="button"
                onClick={() => setActivePanel(MeetingRoomPanel.NONE)}
                aria-label={intl.formatMessage({ id: "app.close" })}
                className="grid h-9 w-9 place-items-center rounded-lg bg-white/8 text-slate-300 transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activePanel === MeetingRoomPanel.PARTICIPANTS ? (
              <div className="mt-4 space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 rounded-lg bg-white/6 p-3 ring-1 ring-white/8"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-xs font-black">
                      {participant.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">
                        {participant.name}
                      </span>
                      <span className="block text-xs font-semibold text-slate-400">
                        {intl.formatMessage({ id: participant.roleId })}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : activePanel === MeetingRoomPanel.CHAT ? (
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
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-white/6 p-4 ring-1 ring-white/8">
                  <p className="text-sm font-black text-slate-100">
                    {intl.formatMessage({
                      id: "meeting.room.panel.autoAdminTitle",
                    })}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
                    {intl.formatMessage({
                      id: "meeting.room.panel.autoAdminDescription",
                    })}
                  </p>
                </div>
              </div>
            )}
          </aside>
        ) : null}
      </main>

      <footer className="flex shrink-0 items-center justify-center border-t border-white/10 bg-[#0d1420]/95 px-3 py-3 backdrop-blur">
        <div className="flex max-w-full items-center gap-2 overflow-x-auto">
          <MeetingRoomControlButton
            label={intl.formatMessage({
              id: microphoneEnabled
                ? "meeting.room.control.mute"
                : "meeting.room.control.unmute",
            })}
            icon={microphoneEnabled ? Mic : MicOff}
            active={microphoneEnabled}
            onClick={() => setMicrophoneEnabled((current) => !current)}
          />
          <MeetingRoomControlButton
            label={intl.formatMessage({
              id: cameraEnabled
                ? "meeting.room.control.stopVideo"
                : "meeting.room.control.startVideo",
            })}
            icon={cameraEnabled ? Video : VideoOff}
            active={cameraEnabled}
            onClick={() => setCameraEnabled((current) => !current)}
          />

          {meetingRoomControlItems.slice(2).map((control) => {
            const isPanelControl =
              control.id === MeetingRoomPanel.PARTICIPANTS ||
              control.id === MeetingRoomPanel.CHAT ||
              control.id === MeetingRoomPanel.SETTINGS;
            const isActive = isPanelControl && activePanel === control.id;

            return (
              <MeetingRoomControlButton
                key={control.id}
                label={intl.formatMessage({ id: control.labelId })}
                icon={control.icon}
                active={isActive}
                disabled={!isPanelControl}
                onClick={() => {
                  if (isPanelControl) {
                    setActivePanel((current) =>
                      current === control.id
                        ? MeetingRoomPanel.NONE
                        : control.id,
                    );
                  }
                }}
              />
            );
          })}

          <MeetingRoomControlButton
            label={intl.formatMessage({ id: "meeting.room.control.leave" })}
            icon={LogOut}
            danger
            onClick={handleLeave}
          />
        </div>
      </footer>

      {activePanel !== MeetingRoomPanel.NONE ? (
        <div className="border-t border-white/10 bg-[#0d1420] p-3 lg:hidden">
          <div className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-2 text-sm font-black text-slate-200 ring-1 ring-white/8">
            <span>
              {intl.formatMessage({
                id:
                  activePanel === MeetingRoomPanel.PARTICIPANTS
                    ? "meeting.room.panel.participants"
                    : activePanel === MeetingRoomPanel.CHAT
                      ? "meeting.room.panel.chat"
                      : "meeting.room.panel.settings",
              })}
            </span>
            <button
              type="button"
              onClick={() => setActivePanel(MeetingRoomPanel.NONE)}
              className="grid h-8 w-8 place-items-center rounded-md bg-white/8"
              aria-label={intl.formatMessage({ id: "app.close" })}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

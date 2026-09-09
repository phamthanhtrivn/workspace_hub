"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  Loader2,
  Lock,
  Search,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { searchUserByEmail } from "@/features/chat/api/chat.api";
import type { UserSearchResponse } from "@/features/chat/types/chat.types";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useAppSelector } from "@/store/store";
import { MeetingAutoAdmitToggle } from "../common/meeting-auto-admit-toggle";
import { MeetingParticipantChatToggle } from "../common/meeting-participant-chat-toggle";
import { MeetingScreenShareToggle } from "../common/meeting-screen-share-toggle";
import {
  useCreateScheduledMeeting,
  useUpdateScheduledMeeting,
} from "../../hooks/useScheduledMeetings";
import {
  scheduleMeetingSchema,
  type ScheduleMeetingValues,
} from "../../schemas/schedule-meeting.schema";
import type {
  MeetingParticipantResponse,
  UpcomingMeetingItem,
} from "../../types/meeting.types";

interface MeetingTimeOption {
  value: string;
  label: string;
}

interface ScheduleMeetingModalProps {
  open: boolean;
  meeting?: UpcomingMeetingItem | null;
  onClose: () => void;
}

const QUARTER_HOUR_MINUTES = 15;
const MINUTES_PER_DAY = 24 * 60;
const MEETING_USER_STALE_TIME_MS = 5 * 60 * 1000;
const MEETING_DURATION_OPTIONS = [
  30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480, 600, 720,
];

const meetingInviteeKeys = {
  search: (query: string) => ["meeting", "invitees", "search", query] as const,
};

function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
}

function useMeetingInviteeSearch(query: string) {
  const normalizedQuery = useDebouncedValue(query.trim(), 350);

  return useQuery({
    queryKey: meetingInviteeKeys.search(normalizedQuery),
    queryFn: async () => {
      const response = await searchUserByEmail(normalizedQuery);
      return response.success ? response.data : [];
    },
    enabled: normalizedQuery.length > 0,
    staleTime: MEETING_USER_STALE_TIME_MS,
  });
}

function toDateTimeLocal(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString();
}

function getDateInputValue(value: string): string {
  return value.split("T")[0] || "";
}

function getTimeInputValue(value: string): string {
  return value.split("T")[1]?.slice(0, 5) || "00:00";
}

function composeDateTimeLocal(date: string, time: string): string {
  return `${date}T${time || "00:00"}`;
}

function addMinutesToDateTimeLocal(value: string, minutes: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  date.setMinutes(date.getMinutes() + minutes);
  return toDateTimeLocal(date);
}

function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(minutes: number, locale: string): string {
  const vietnamese = locale.toLowerCase().startsWith("vi");
  if (minutes < 60) return `${minutes} ${vietnamese ? "phút" : "mins"}`;

  const hours = minutes / 60;
  const formattedHours = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(hours);

  return vietnamese
    ? `${formattedHours} giờ`
    : `${formattedHours} ${hours === 1 ? "hr" : "hrs"}`;
}

function createStartTimeOptions(
  locale: string,
  currentTime?: string,
): MeetingTimeOption[] {
  const values = Array.from(
    { length: MINUTES_PER_DAY / QUARTER_HOUR_MINUTES },
    (_, index) => index * QUARTER_HOUR_MINUTES,
  );
  const currentMinutes = currentTime
    ? Number(currentTime.slice(0, 2)) * 60 + Number(currentTime.slice(3, 5))
    : Number.NaN;

  if (Number.isFinite(currentMinutes) && !values.includes(currentMinutes)) {
    values.push(currentMinutes);
    values.sort((first, second) => first - second);
  }

  return values.map((minutes) => {
    const date = new Date(2000, 0, 1, 0, minutes);
    return {
      value: `${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes(),
      ).padStart(2, "0")}`,
      label: formatTime(date, locale),
    };
  });
}

function createEndTimeOptions(
  startAt: string,
  currentEndAt: string,
  locale: string,
): MeetingTimeOption[] {
  const start = new Date(startAt);
  const currentEnd = new Date(currentEndAt);
  if (Number.isNaN(start.getTime())) return [];

  const durations = [...MEETING_DURATION_OPTIONS];
  const currentDuration = Math.round(
    (currentEnd.getTime() - start.getTime()) / 60_000,
  );
  if (currentDuration > 0 && !durations.includes(currentDuration)) {
    durations.push(currentDuration);
    durations.sort((first, second) => first - second);
  }

  return durations.map((minutes) => {
    const end = new Date(start.getTime() + minutes * 60_000);
    return {
      value: toDateTimeLocal(end),
      label: `${formatTime(end, locale)} (${formatDuration(minutes, locale)})`,
    };
  });
}

function createDefaultScheduleValues(): ScheduleMeetingValues {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setMinutes(0, 0, 0);
  start.setHours(Math.max(9, start.getHours() + 1));

  return {
    title: "",
    scheduledStartAt: toDateTimeLocal(start),
    scheduledEndAt: addMinutesToDateTimeLocal(toDateTimeLocal(start), 60),
    recurrenceRule: null,
    description: "",
    inviteeIds: [],
    password: "",
    requirePassword: false,
    autoAdmit: false,
    chatEnabled: true,
    screenShareEnabled: true,
  };
}

function createScheduleValuesFromMeeting(
  meeting: UpcomingMeetingItem,
): ScheduleMeetingValues {
  const defaults = createDefaultScheduleValues();
  const scheduledStartAt = meeting.scheduledStartAt
    ? toDateTimeLocal(meeting.scheduledStartAt)
    : defaults.scheduledStartAt;
  const scheduledEndAt = meeting.scheduledEndAt
    ? toDateTimeLocal(meeting.scheduledEndAt)
    : addMinutesToDateTimeLocal(scheduledStartAt, 60);

  return {
    ...defaults,
    title: meeting.title,
    scheduledStartAt,
    scheduledEndAt,
    description: meeting.description ?? "",
    inviteeIds: meeting.participants
      .filter((participant) => participant.userId !== meeting.hostUserId)
      .map((participant) => participant.userId),
    password: "",
    requirePassword: meeting.requiresPassword,
    autoAdmit: meeting.autoAdmit,
    chatEnabled: meeting.chatEnabled,
    screenShareEnabled: meeting.screenShareEnabled,
  };
}

function participantToUserSearch(
  participant: MeetingParticipantResponse,
): UserSearchResponse {
  return {
    id: participant.userId,
    email: participant.profile?.email ?? participant.userId,
    fullName: participant.profile?.fullName ?? null,
    avatarUrl: participant.profile?.avatarUrl ?? null,
  };
}

export function ScheduleMeetingModal({
  open,
  meeting,
  onClose,
}: ScheduleMeetingModalProps) {
  const intl = useAppIntl();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const createMeeting = useCreateScheduledMeeting();
  const updateMeeting = useUpdateScheduledMeeting(meeting?.joinToken ?? "");
  const [inviteeQuery, setInviteeQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResponse[]>([]);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const isEditing = Boolean(meeting);
  const { data: inviteeResults = [], isFetching } =
    useMeetingInviteeSearch(inviteeQuery);
  const form = useForm<ScheduleMeetingValues>({
    resolver: zodResolver(scheduleMeetingSchema),
    defaultValues: createDefaultScheduleValues(),
  });
  const values = form.watch();
  const selectedUserIds = useMemo(
    () => new Set(values.inviteeIds),
    [values.inviteeIds],
  );
  const startTimeOptions = useMemo(
    () =>
      createStartTimeOptions(
        intl.locale,
        getTimeInputValue(values.scheduledStartAt),
      ),
    [intl.locale, values.scheduledStartAt],
  );
  const endTimeOptions = useMemo(
    () =>
      createEndTimeOptions(
        values.scheduledStartAt,
        values.scheduledEndAt,
        intl.locale,
      ),
    [intl.locale, values.scheduledEndAt, values.scheduledStartAt],
  );
  const isSubmitting = isEditing ? updateMeeting.isPending : createMeeting.isPending;

  useEffect(() => {
    if (!open) return;

    form.reset(
      meeting ? createScheduleValuesFromMeeting(meeting) : createDefaultScheduleValues(),
    );
    setSelectedUsers(
      meeting
        ? meeting.participants
            .filter((participant) => participant.userId !== meeting.hostUserId)
            .map(participantToUserSearch)
        : [],
    );
    setInviteeQuery("");
  }, [form, meeting, open]);
  if (!open) return null;

  const updateInvitees = (users: UserSearchResponse[]) => {
    setSelectedUsers(users);
    form.setValue(
      "inviteeIds",
      users.map((user) => user.id),
      { shouldDirty: true, shouldValidate: true },
    );
  };
  const addInvitee = (user: UserSearchResponse) => {
    if (user.id === currentUserId || selectedUserIds.has(user.id)) return;
    updateInvitees([...selectedUsers, user]);
    setInviteeQuery("");
  };
  const removeInvitee = (userId: string) => {
    updateInvitees(selectedUsers.filter((user) => user.id !== userId));
  };
  const updateStartDate = (date: string) => {
    const nextStartAt = composeDateTimeLocal(
      date,
      getTimeInputValue(values.scheduledStartAt),
    );
    form.setValue("scheduledStartAt", nextStartAt, { shouldDirty: true });
    form.setValue(
      "scheduledEndAt",
      addMinutesToDateTimeLocal(nextStartAt, 60),
      { shouldDirty: true, shouldValidate: true },
    );
  };
  const updateStartTime = (time: string) => {
    const nextStartAt = composeDateTimeLocal(
      getDateInputValue(values.scheduledStartAt),
      time,
    );
    form.setValue("scheduledStartAt", nextStartAt, { shouldDirty: true });
    form.setValue(
      "scheduledEndAt",
      addMinutesToDateTimeLocal(nextStartAt, 60),
      { shouldDirty: true, shouldValidate: true },
    );
  };
  const onSubmit = form.handleSubmit(
    async (formValues) => {
      const payload = {
        title: formValues.title.trim(),
        scheduledStartAt: fromDateTimeLocal(formValues.scheduledStartAt),
        scheduledEndAt: fromDateTimeLocal(formValues.scheduledEndAt),
        recurrenceRule: null,
        description: formValues.description.trim() || null,
        inviteeIds: formValues.inviteeIds,
        password: formValues.requirePassword
          ? formValues.password.trim()
          : undefined,
        autoAdmit: formValues.autoAdmit,
        chatEnabled: formValues.chatEnabled,
        screenShareEnabled: formValues.screenShareEnabled,
      };

      if (meeting) {
        await updateMeeting.mutateAsync(payload);
        toast.success(intl.formatMessage({ id: "meeting.schedule.updated" }));
      } else {
        await createMeeting.mutateAsync(payload);
        toast.success(intl.formatMessage({ id: "meeting.schedule.created" }));
      }
      form.reset(createDefaultScheduleValues());
      setSelectedUsers([]);
      setInviteeQuery("");
      onClose();
    },
    (errors) => {
      const message =
        errors.scheduledEndAt?.message ||
        errors.scheduledStartAt?.message ||
        errors.password?.message ||
        errors.title?.message ||
        "meeting.schedule.invalid";
      toast.error(
        intl.formatMessage({
          id: typeof message === "string" ? message : "meeting.schedule.invalid",
        }),
      );
    },
  );

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 px-3 py-6">
      <form
        onSubmit={onSubmit}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white text-[#172B4D] shadow-[0_28px_90px_rgba(15,23,42,0.28)]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black">
            {intl.formatMessage({
              id: isEditing ? "meeting.schedule.editTitle" : "meeting.schedule.title",
            })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-md text-slate-500 hover:bg-slate-100"
            aria-label={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <input
            {...form.register("title")}
            autoFocus
            placeholder={intl.formatMessage({
              id: "meeting.schedule.meetingTitle",
            })}
            className="h-12 w-full border-0 border-b border-slate-200 px-0 text-xl font-black outline-none placeholder:text-slate-400 focus:border-[#0052CC]"
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "meeting.schedule.date" })}
              </span>
              <input
                type="date"
                value={getDateInputValue(values.scheduledStartAt)}
                onChange={(event) => updateStartDate(event.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#0052CC] focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "meeting.schedule.start" })}
              </span>
              <select
                value={getTimeInputValue(values.scheduledStartAt)}
                aria-label={intl.formatMessage({ id: "meeting.schedule.start" })}
                onChange={(event) => updateStartTime(event.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#0052CC] focus:ring-4 focus:ring-blue-100"
              >
                {startTimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "meeting.schedule.end" })}
              </span>
              <select
                value={values.scheduledEndAt}
                aria-label={intl.formatMessage({ id: "meeting.schedule.end" })}
                onChange={(event) =>
                  form.setValue("scheduledEndAt", event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#0052CC] focus:ring-4 focus:ring-blue-100"
              >
                {endTimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400">
              {intl.formatMessage({ id: "meeting.schedule.invitePeople" })}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={inviteeQuery}
                onChange={(event) => setInviteeQuery(event.target.value)}
                placeholder={intl.formatMessage({
                  id: "meeting.schedule.searchPeople",
                })}
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-4 focus:ring-blue-100"
              />
            </div>
            {inviteeQuery.trim() ? (
              <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200">
                {isFetching ? (
                  <div className="px-3 py-3 text-sm font-semibold text-slate-400">
                    {intl.formatMessage({ id: "chat.searching" })}
                  </div>
                ) : inviteeResults.length === 0 ? (
                  <div className="px-3 py-3 text-sm font-semibold text-slate-400">
                    {intl.formatMessage({ id: "chat.noResults" })}
                  </div>
                ) : (
                  inviteeResults
                    .filter((user) => user.id !== currentUserId)
                    .map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        disabled={selectedUserIds.has(user.id)}
                        onClick={() => addInvitee(user)}
                        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Avatar user={user} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {user.fullName || user.email}
                          </span>
                          <span className="block truncate text-xs font-semibold text-slate-400">
                            {user.email}
                          </span>
                        </span>
                      </button>
                    ))
                )}
              </div>
            ) : null}
            {selectedUsers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-2 text-xs font-bold"
                  >
                    <Avatar user={user} size={24} />
                    <span className="max-w-36 truncate">
                      {user.fullName || user.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeInvitee(user.id)}
                      className="cursor-pointer text-slate-400 hover:text-slate-700"
                      aria-label={intl.formatMessage({ id: "app.delete" })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <textarea
            {...form.register("description")}
            rows={3}
            placeholder={intl.formatMessage({
              id: "meeting.schedule.description",
            })}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-4 focus:ring-blue-100"
          />

          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setOptionsOpen((current) => !current)}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg px-1 py-2 text-sm font-black text-slate-600"
            >
              {intl.formatMessage({ id: "meeting.schedule.options" })}
              <ChevronDown
                className={`h-4 w-4 transition ${optionsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {optionsOpen ? (
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                  <input
                    type="checkbox"
                    {...form.register("requirePassword")}
                    className="h-4 w-4"
                  />
                  <Lock className="h-4 w-4 text-[#0052CC]" />
                  <span className="text-sm font-black">
                    {intl.formatMessage({
                      id: "meeting.schedule.requirePassword",
                    })}
                  </span>
                </label>
                {values.requirePassword ? (
                  <input
                    type="password"
                    {...form.register("password")}
                    placeholder={intl.formatMessage({
                      id: "meeting.schedule.password",
                    })}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#0052CC] focus:ring-4 focus:ring-blue-100"
                  />
                ) : null}
                <MeetingAutoAdmitToggle
                  checked={values.autoAdmit}
                  onCheckedChange={(checked) =>
                    form.setValue("autoAdmit", checked, { shouldDirty: true })
                  }
                />
                <MeetingParticipantChatToggle
                  checked={values.chatEnabled}
                  onCheckedChange={(checked) =>
                    form.setValue("chatEnabled", checked, { shouldDirty: true })
                  }
                />
                <MeetingScreenShareToggle
                  checked={values.screenShareEnabled}
                  onCheckedChange={(checked) =>
                    form.setValue("screenShareEnabled", checked, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
            ) : null}
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-lg px-4 text-sm font-black text-slate-600 hover:bg-slate-100"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#0052CC] px-4 text-sm font-black text-white shadow-sm hover:bg-[#0C66E4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {intl.formatMessage({
              id: isEditing ? "meeting.schedule.update" : "meeting.schedule.schedule",
            })}
          </button>
        </div>
      </form>
    </div>
  );
}

function Avatar({
  user,
  size = 32,
}: {
  user: UserSearchResponse;
  size?: number;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100"
      style={{ width: size, height: size }}
    >
      {user.avatarUrl ? (
        <Image
          src={user.avatarUrl}
          alt={user.fullName || user.email}
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <User className="h-4 w-4 text-slate-400" />
      )}
    </span>
  );
}

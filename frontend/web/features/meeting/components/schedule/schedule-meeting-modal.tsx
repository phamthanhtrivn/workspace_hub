"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Search,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchUserByEmail } from "@/features/chat/api/chat.api";
import type { UserSearchResponse } from "@/features/chat/types/chat.types";
import { useAppSelector } from "@/store/store";
import { MeetingAutoAdmitToggle } from "../common/meeting-auto-admit-toggle";
import { MeetingParticipantChatToggle } from "../common/meeting-participant-chat-toggle";
import { MeetingScreenShareToggle } from "../common/meeting-screen-share-toggle";
import {
  MeetingButton,
  MeetingInput,
  MeetingSelect,
  MeetingTextarea,
} from "../ui/meeting-form-controls";
import { MeetingIconButton } from "../ui/meeting-icon-button";
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
const DEFAULT_SCHEDULED_MEETING_TITLE = "Schedule meeting";

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

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`;

  const hours = minutes / 60;
  const formattedHours = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(hours);

  return `${formattedHours} ${hours === 1 ? "hr" : "hrs"}`;
}

function createStartTimeOptions(currentTime?: string): MeetingTimeOption[] {
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
      label: formatTime(date),
    };
  });
}

function createEndTimeOptions(
  startAt: string,
  currentEndAt: string,
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
      label: `${formatTime(end)} (${formatDuration(minutes)})`,
    };
  });
}

function createDefaultScheduleValues(): ScheduleMeetingValues {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setMinutes(0, 0, 0);
  start.setHours(Math.max(9, start.getHours() + 1));

  return {
    title: DEFAULT_SCHEDULED_MEETING_TITLE,
    scheduledStartAt: toDateTimeLocal(start),
    scheduledEndAt: addMinutesToDateTimeLocal(toDateTimeLocal(start), 60),
    recurrenceRule: null,
    description: "",
    inviteeIds: [],
    password: "",
    requirePassword: false,
    hasExistingPassword: false,
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
    hasExistingPassword: meeting.requiresPassword,
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
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const createMeeting = useCreateScheduledMeeting();
  const updateMeeting = useUpdateScheduledMeeting(meeting?.joinToken ?? "");
  const [inviteeQuery, setInviteeQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResponse[]>([]);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isEditing = Boolean(meeting);
  const { data: inviteeResults = [], isFetching } =
    useMeetingInviteeSearch(inviteeQuery);
  const form = useForm<ScheduleMeetingValues>({
    resolver: zodResolver(scheduleMeetingSchema),
    defaultValues: createDefaultScheduleValues(),
  });
  const values = useWatch({ control: form.control }) as ScheduleMeetingValues;
  const selectedUserIds = useMemo(
    () => new Set(values.inviteeIds),
    [values.inviteeIds],
  );
  const startTimeOptions = useMemo(
    () =>
      createStartTimeOptions(
        getTimeInputValue(values.scheduledStartAt),
      ),
    [values.scheduledStartAt],
  );
  const endTimeOptions = useMemo(
    () =>
      createEndTimeOptions(
        values.scheduledStartAt,
        values.scheduledEndAt,
      ),
    [values.scheduledEndAt, values.scheduledStartAt],
  );
  const isSubmitting = isEditing ? updateMeeting.isPending : createMeeting.isPending;

  useEffect(() => {
    if (!open) return;

    form.reset(
      meeting ? createScheduleValuesFromMeeting(meeting) : createDefaultScheduleValues(),
    );
    const nextSelectedUsers = meeting
        ? meeting.participants
            .filter((participant) => participant.userId !== meeting.hostUserId)
            .map(participantToUserSearch)
        : [];
    const resetTimer = window.setTimeout(() => {
      setSelectedUsers(nextSelectedUsers);
      setInviteeQuery("");
    }, 0);

    return () => window.clearTimeout(resetTimer);
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
      const normalizedPassword = formValues.password.trim();
      const password = formValues.requirePassword
        ? normalizedPassword || undefined
        : formValues.hasExistingPassword
          ? ""
          : undefined;
      const payload = {
        title: formValues.title.trim(),
        scheduledStartAt: fromDateTimeLocal(formValues.scheduledStartAt),
        scheduledEndAt: fromDateTimeLocal(formValues.scheduledEndAt),
        recurrenceRule: null,
        description: formValues.description.trim() || null,
        inviteeIds: formValues.inviteeIds,
        password,
        autoAdmit: formValues.autoAdmit,
        chatEnabled: formValues.chatEnabled,
        screenShareEnabled: formValues.screenShareEnabled,
      };

      if (meeting) {
        await updateMeeting.mutateAsync(payload);
        toast.success("Meeting updated");
      } else {
        await createMeeting.mutateAsync(payload);
        toast.success("Meeting scheduled");
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
        "Check the meeting details and try again.";
      toast.error(typeof message === "string" ? message : "Check the meeting details and try again.");
    },
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="max-w-2xl overflow-y-auto p-0 text-[#172B4D]"
        showCloseButton={false}
      >
      <form
        onSubmit={onSubmit}
        className="max-h-[92dvh] overflow-y-auto"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
          <DialogTitle className="text-lg font-black">
            {isEditing ? "Edit meeting" : "Schedule a meeting"}
          </DialogTitle>
          <MeetingIconButton
            label="Close"
            icon={X}
            onClick={onClose}
          />
        </DialogHeader>

        <div className="space-y-5 px-5 py-5">
          <MeetingInput
            {...form.register("title")}
            autoFocus
            placeholder="Meeting title"
            className="h-12 w-full border-0 border-b border-slate-200 px-0 text-xl font-black outline-none placeholder:text-slate-400 focus:border-[#0052CC]"
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase text-slate-400">
                Date
              </span>
              <MeetingInput
                type="date"
                value={getDateInputValue(values.scheduledStartAt)}
                onChange={(event) => updateStartDate(event.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#0052CC] focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase text-slate-400">
                Start time
              </span>
              <MeetingSelect
                value={getTimeInputValue(values.scheduledStartAt)}
                ariaLabel="Start time"
                onChange={updateStartTime}
                options={startTimeOptions}
                triggerClassName="h-10 rounded-lg border-slate-200"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase text-slate-400">
                End time
              </span>
              <MeetingSelect
                value={values.scheduledEndAt}
                ariaLabel="End time"
                onChange={(nextValue) =>
                  form.setValue("scheduledEndAt", nextValue, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                options={endTimeOptions}
                triggerClassName="h-10 rounded-lg border-slate-200"
              />
            </label>
          </div>

          <section className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400">
              Invite people
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <MeetingInput
                value={inviteeQuery}
                onChange={(event) => setInviteeQuery(event.target.value)}
                placeholder="Search people..."
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-4 focus:ring-blue-100"
              />
            </div>
            {inviteeQuery.trim() ? (
              <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200">
                {isFetching ? (
                  <div className="px-3 py-3 text-sm font-semibold text-slate-400">
                    Searching...
                  </div>
                ) : inviteeResults.length === 0 ? (
                  <div className="px-3 py-3 text-sm font-semibold text-slate-400">
                    No results
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
                      aria-label="Delete"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <MeetingTextarea
            {...form.register("description")}
            rows={3}
            placeholder="Description"
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-4 focus:ring-blue-100"
          />

          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setOptionsOpen((current) => !current)}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg px-1 py-2 text-sm font-black text-slate-600"
            >
              Meeting options
              <ChevronDown
                className={`h-4 w-4 transition ${optionsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {optionsOpen ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                  <Checkbox
                    checked={values.requirePassword}
                    onCheckedChange={(checked) =>
                      form.setValue("requirePassword", checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  <Lock className="h-4 w-4 text-[#0052CC]" />
                  <span className="text-sm font-black">
                    Require password
                  </span>
                </div>
                {values.requirePassword ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <MeetingInput
                        type={showPassword ? "text" : "password"}
                        {...form.register("password")}
                        placeholder="Meeting password"
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 pr-11 text-sm font-semibold outline-none focus:border-[#0052CC] focus:ring-4 focus:ring-blue-100"
                      />
                      <MeetingIconButton
                        label={showPassword ? "Hide meeting password" : "Show meeting password"}
                        icon={showPassword ? EyeOff : Eye}
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2"
                      />
                    </div>
                    {isEditing && values.hasExistingPassword ? (
                      <p className="text-xs font-semibold leading-5 text-slate-500">
                        Leave this blank to keep the current meeting password.
                      </p>
                    ) : null}
                  </div>
                ) : isEditing && values.hasExistingPassword ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-700 ring-1 ring-amber-100">
                    The current password will be removed when you save.
                  </p>
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

        <DialogFooter>
          <MeetingButton
            type="button"
            tone="ghost"
            onClick={onClose}
            className="cursor-pointer"
          >
            Cancel
          </MeetingButton>
          <MeetingButton
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEditing ? "Update" : "Schedule"}
          </MeetingButton>
        </DialogFooter>
      </form>
      </DialogContent>
    </Dialog>
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



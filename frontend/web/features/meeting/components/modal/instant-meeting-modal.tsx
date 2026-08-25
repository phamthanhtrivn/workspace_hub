"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useCreateInstantMeetingMutation } from "../../hooks/useMeetingQueries";

interface InstantMeetingModalProps {
  open: boolean;
  onClose: () => void;
}

export function InstantMeetingModal({
  open,
  onClose,
}: InstantMeetingModalProps) {
  const intl = useAppIntl();
  const [title, setTitle] = useState("");
  const [allowJoinWithoutApproval, setAllowJoinWithoutApproval] =
    useState(false);
  const createMeeting = useCreateInstantMeetingMutation();

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createMeeting.mutateAsync({
      title: title.trim() || undefined,
      allowJoinWithoutApproval,
    });
    setTitle("");
    setAllowJoinWithoutApproval(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4"
      role="presentation"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            {intl.formatMessage({ id: "meeting.createInstantTitle" })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              {intl.formatMessage({ id: "meeting.titleLabel" })}
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder={intl.formatMessage({
                id: "meeting.titlePlaceholder",
              })}
            />
          </label>

          <label className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-3">
            <input
              type="checkbox"
              checked={allowJoinWithoutApproval}
              onChange={(event) =>
                setAllowJoinWithoutApproval(event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                {intl.formatMessage({ id: "meeting.allowWithoutApproval" })}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {intl.formatMessage({
                  id: "meeting.allowWithoutApprovalHelp",
                })}
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={createMeeting.isPending}
            className="h-9 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMeeting.isPending
              ? intl.formatMessage({ id: "meeting.creating" })
              : intl.formatMessage({ id: "meeting.createInstant" })}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { Trash2, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import { CALENDAR_DEFAULT_EVENT_COLOR } from "../../types/calendar.constants";
import {
  CalendarColorPicker,
  CalendarIconPicker,
} from "../sidebar/calendar-style-fields";

export interface CalendarModalValues {
  name: string;
  icon: string | null;
  color: string;
}

interface CalendarModalBaseProps {
  pending: boolean;
  onClose: () => void;
  onSave: (values: CalendarModalValues) => Promise<boolean>;
}

interface CreateCalendarModalProps extends CalendarModalBaseProps {
  mode: "create";
}

interface EditCalendarModalProps extends CalendarModalBaseProps {
  mode: "edit";
  initialValues: CalendarModalValues;
  canDelete?: boolean;
  onRequestDelete?: () => void;
}

type CalendarModalProps =
  | CreateCalendarModalProps
  | EditCalendarModalProps;

export function CalendarModal(props: CalendarModalProps) {
  const intl = useAppIntl();
  const dialogRef = useRef<HTMLFormElement>(null);
  const initialValues =
    props.mode === "create"
      ? {
          name: "",
          icon: null,
          color: CALENDAR_DEFAULT_EVENT_COLOR,
        }
      : props.initialValues;
  const [name, setName] = useState(initialValues.name);
  const [icon, setIcon] = useState<string | null>(initialValues.icon);
  const [color, setColor] = useState(initialValues.color);
  const [showCustomColor, setShowCustomColor] = useState(false);
  const isCreateMode = props.mode === "create";
  const headingId = `calendar-${props.mode}-heading`;
  const previewName =
    name.trim() ||
    intl.formatMessage({ id: "calendar.calendarNamePlaceholder" });

  useModalDialog({ dialogRef, onClose: props.onClose });

  if (typeof document === "undefined") return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();

    if (!normalizedName) {
      toast.error(intl.formatMessage({ id: "calendar.nameRequired" }));
      return;
    }

    const saved = await props.onSave({
      name: normalizedName,
      icon,
      color,
    });
    if (saved) props.onClose();
  };

  const handleDeleteRequest = () => {
    if (props.mode !== "edit") return;
    props.onClose();
    props.onRequestDelete?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2
            id={headingId}
            className="text-base font-semibold text-slate-800"
          >
            {intl.formatMessage({
              id: isCreateMode
                ? "calendar.createCalendar"
                : "calendar.editCalendar",
            })}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={props.pending}
            onClick={props.onClose}
            aria-label={intl.formatMessage({ id: "app.close" })}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-wait disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {intl.formatMessage({ id: "calendar.preview" })}
            </p>
            <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-xs">
              <span
                className="grid h-4.5 w-4.5 place-items-center rounded-[5px] border"
                style={{ borderColor: color, backgroundColor: color }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              {icon ? (
                <span className="shrink-0 text-sm leading-none">{icon}</span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                {previewName}
              </span>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {intl.formatMessage({ id: "calendar.calendarName" })}
            </span>
            <Input
              data-modal-initial-focus
              value={name}
              maxLength={120}
              disabled={props.pending}
              onChange={(event) => setName(event.target.value)}
              placeholder={intl.formatMessage({
                id: "calendar.calendarNamePlaceholder",
              })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-700 shadow-none outline-none transition placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100 disabled:opacity-60"
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {intl.formatMessage({ id: "calendar.icon" })}
            </span>
            <CalendarIconPicker value={icon} onChange={setIcon} />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {intl.formatMessage({ id: "calendar.color" })}
            </span>
            <CalendarColorPicker
              value={color}
              showCustomColor={showCustomColor}
              onChange={setColor}
              onShowCustomColor={setShowCustomColor}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5">
          {props.mode === "edit" && props.canDelete ? (
            <Button
              type="button"
              variant="ghost"
              disabled={props.pending}
              onClick={handleDeleteRequest}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {intl.formatMessage({ id: "calendar.deleteCalendar" })}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={props.pending}
              onClick={props.onClose}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {intl.formatMessage({ id: "app.cancel" })}
            </Button>
            <Button
              type="submit"
              disabled={props.pending}
              className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {intl.formatMessage({
                id: props.pending
                  ? "app.saving"
                  : isCreateMode
                    ? "app.create"
                    : "app.save",
              })}
            </Button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}

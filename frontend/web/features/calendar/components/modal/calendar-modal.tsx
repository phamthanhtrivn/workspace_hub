"use client";

import { readableTextOnColor } from "@/lib/color";

import { Trash2, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { CALENDAR_DEFAULT_EVENT_COLOR } from "../../types/calendar.constants";
import {
  CalendarColorPicker,
  CalendarIconPicker,
} from "../sidebar/calendar-style-fields";
import { DialogSurface } from "@/components/ui/dialog";

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
  const previewName = name.trim() || "Calendar name";



  if (typeof document === "undefined") return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();

    if (!normalizedName) {
      toast.error("Calendar name is required");
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

  return <DialogSurface onClose={props.onClose}>{<div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay/40 p-4"
      onWheelCapture={(event) => {
        if (
          event.target instanceof Node &&
          dialogRef.current?.contains(event.target)
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      }}
      onTouchMoveCapture={(event) => {
        if (
          event.target instanceof Node &&
          dialogRef.current?.contains(event.target)
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <form
        ref={dialogRef}


        aria-labelledby={headingId}
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-panel border border-border bg-card"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2
            id={headingId}
            className="text-section-title font-semibold text-foreground"
          >
            {isCreateMode ? "Create calendar" : "Edit calendar"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={props.pending}
            onClick={props.onClose}
            aria-label="Close"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5">
          <div className="rounded-panel border border-border bg-background p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preview
            </p>
            <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
              <span
                className="grid h-4.5 w-4.5 place-items-center rounded-[5px] border"
                style={{ borderColor: "var(--input)", backgroundColor: color, color: readableTextOnColor(color) }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              {icon ? (
                <span className="shrink-0 text-sm leading-none">{icon}</span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {previewName}
              </span>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Calendar name
            </span>
            <Input
              data-modal-initial-focus
              value={name}
              maxLength={120}
              disabled={props.pending}
              onChange={(event) => setName(event.target.value)}
              placeholder="Calendar name"
              className="h-10 w-full rounded-control border border-input px-3.5 py-2 text-sm text-foreground shadow-none outline-none transition placeholder:text-muted-foreground focus-visible:border-info-outline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Icon
            </span>
            <CalendarIconPicker value={icon} onChange={setIcon} />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Color
            </span>
            <CalendarColorPicker
              value={color}
              showCustomColor={showCustomColor}
              onChange={setColor}
              onShowCustomColor={setShowCustomColor}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
          {props.mode === "edit" && props.canDelete ? (
            <Button
              type="button"
              variant="ghost"
              disabled={props.pending}
              onClick={handleDeleteRequest}
              className="inline-flex cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold text-destructive-content transition hover:bg-destructive-soft hover:text-destructive-content disabled:cursor-wait disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Delete calendar
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
              className="cursor-pointer rounded-control border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-wait disabled:opacity-60"
            >
              Cancel
            </Button>
            <Button loading={props.pending}
              type="submit"
              disabled={props.pending}
              className="cursor-pointer rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary disabled:cursor-wait disabled:opacity-60"
            >
              {props.pending ? "Saving..." : isCreateMode ? "Create" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </div>}</DialogSurface>;
}

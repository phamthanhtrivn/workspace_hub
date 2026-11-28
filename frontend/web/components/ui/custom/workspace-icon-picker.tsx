"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Ban, SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  APPEARANCE_COPY as copy,
  WORKSPACE_ICON_MAX_CODE_POINTS,
  WORKSPACE_ICON_OPTIONS,
} from "./appearance.constants";

const EmojiPicker = dynamic(() => import("./workspace-emoji-picker"), {
  ssr: false,
  loading: () => (
    <p className="p-4 text-sm text-muted-foreground">{copy.loadingIcons}</p>
  ),
});

export function WorkspaceIconPicker({
  value,
  onChange,
  ariaLabel,
  allowNone = false,
  disabled,
  compact = false,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
  ariaLabel: string;
  allowNone?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const icons: readonly string[] =
    value && !WORKSPACE_ICON_OPTIONS.some((icon) => icon === value)
      ? [...WORKSPACE_ICON_OPTIONS, value]
      : WORKSPACE_ICON_OPTIONS;
  const select = (icon: string) => {
    if ([...icon].length > WORKSPACE_ICON_MAX_CODE_POINTS) {
      setError(copy.iconTooLong);

      return;
    }
    onChange(icon);
    setOpen(false);
    setError(null);
  };
  const iconClass = (selected: boolean) =>
    cn(
      "shrink-0 rounded-control border p-0 text-base transition-colors",
      compact ? "size-8" : "size-9",
      selected
        ? "border-primary bg-primary-soft ring-1 ring-primary/20 hover:bg-primary-soft"
        : "border-transparent bg-muted hover:border-input hover:bg-accent",
    );

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {allowNone && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={copy.noIcon}
          aria-pressed={value === null}
          className={iconClass(value === null)}
          onClick={() => onChange(null)}
        >
          <Ban aria-hidden="true" className="size-4" />
        </Button>
      )}
      {icons.map((icon) => (
        <Button
          key={icon}
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={`${ariaLabel}: ${icon}`}
          aria-pressed={icon === value}
          className={iconClass(icon === value)}
          onClick={() => select(icon)}
        >
          {icon}
        </Button>
      ))}
      <Popover
        open={open && !disabled}
        onOpenChange={(next) => {
          setError(null);
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "gap-1.5 rounded-control px-2 text-xs font-medium shadow-none",
              compact ? "h-8" : "h-9",
            )}
          >
            <SmilePlus aria-hidden="true" className="size-4" />
            {copy.moreIcons}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={16}
          className="w-[350px] max-w-[calc(100vw-2rem)] overflow-hidden p-0 [&_.EmojiPickerReact]:!rounded-panel [&_.EmojiPickerReact]:!border-0"
          aria-label={copy.moreIcons}
        >
          {open && <EmojiPicker onSelect={select} />}
          {error && (
            <p
              role="alert"
              className="px-3 py-2 text-xs text-destructive-content"
            >
              {error}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

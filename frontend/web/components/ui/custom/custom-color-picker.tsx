"use client";

import { useState } from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { readableTextOnColor } from "@/lib/color";
import { cn } from "@/lib/utils";
import {
  APPEARANCE_COPY as copy,
  WORKSPACE_COLOR_OPTIONS,
} from "./appearance.constants";
import { normalizeHexColor } from "./color-picker.utils";
import { CustomColorEditor } from "./custom-color-editor";

interface CustomColorPickerProps {
  value: string;
  options?: readonly string[];
  onChange: (color: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  allowCustom?: boolean;
  className?: string;
}

export function CustomColorPicker({
  value,
  options = WORKSPACE_COLOR_OPTIONS,
  onChange,
  ariaLabel,
  disabled,
  allowCustom = true,
  className,
}: CustomColorPickerProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeHexColor(value);
  const selected = options.find(
    (option) => (normalizeHexColor(option) ?? option) === (normalized ?? value),
  );

  return (
    <div className="space-y-3">
      <RadioGroup
        value={selected ?? value}
        disabled={disabled}
        onValueChange={onChange}
        aria-label={ariaLabel}
        className={cn("flex flex-wrap gap-2.5 p-1", className)}
      >
        {options.map((color) => (
          <RadioGroupItem
            key={color}
            value={color}
            aria-label={`${ariaLabel}: ${color}`}
            className="size-8 shrink-0 rounded-full border border-input data-[checked]:ring-2 data-[checked]:ring-ring data-[checked]:ring-offset-2 data-[checked]:ring-offset-background"
            style={{
              backgroundColor: color,
              color: readableTextOnColor(color),
            }}
          >
            {selected === color && (
              <Check aria-hidden="true" className="size-4" />
            )}
          </RadioGroupItem>
        ))}
      </RadioGroup>
      {allowCustom && (
        <Popover open={open && !disabled} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              aria-label={`${ariaLabel}: ${copy.customColor}`}
              className="h-9 w-full justify-start gap-2.5 rounded-control border-input bg-card px-3 text-xs font-medium shadow-none"
            >
              {selected ? (
                <Palette
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-5 shrink-0 place-items-center rounded-full border border-input"
                  style={{
                    backgroundColor: value,
                    color: readableTextOnColor(value),
                  }}
                >
                  <Check className="size-3" />
                </span>
              )}
              <span>{copy.customColor}</span>
              {!selected && (
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {normalized ?? value}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            collisionPadding={16}
            className="w-72 max-w-[calc(100vw-2rem)] p-4"
            aria-label={copy.customColor}
          >
            {open && (
              <CustomColorEditor
                key={value}
                value={value}
                onCancel={() => setOpen(false)}
                onApply={(color) => {
                  if (!disabled) {
                    onChange(color);
                    setOpen(false);
                  }
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

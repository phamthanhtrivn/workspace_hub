"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { readableTextOnColor } from "@/lib/color";
import { cn } from "@/lib/utils";

interface CustomColorPickerProps {
  value: string;
  options: readonly string[];
  onChange: (color: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  allowCustom?: boolean;
  className?: string;
}

export function CustomColorPicker({ value, options, onChange, ariaLabel, disabled, allowCustom = true, className }: CustomColorPickerProps) {
  const id = useId();
  const [edit, setEdit] = useState({ base: value, color: value });
  const draft = edit.base === value ? edit.color : value;
  const validHex = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(draft);
  return <div className="space-y-3">
    <RadioGroup value={options.find((option) => option.toLowerCase() === value.toLowerCase()) ?? value} disabled={disabled}
      onValueChange={(color) => { setEdit({ base: color, color }); onChange(color); }} aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((color) => <RadioGroupItem key={color} value={color} aria-label={`${ariaLabel}: ${color}`}
        className="size-8 rounded-control border border-input data-[checked]:ring-2 data-[checked]:ring-ring data-[checked]:ring-offset-2 data-[checked]:ring-offset-background"
        style={{ backgroundColor: color, color: readableTextOnColor(color) }}>
        {value.toLowerCase() === color.toLowerCase() && <Check aria-hidden className="size-4" />}
      </RadioGroupItem>)}
    </RadioGroup>
    {allowCustom && <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">Custom color (HEX)</label>
      <div className="flex min-w-0 gap-2">
        <Input id={id} value={draft} disabled={disabled} maxLength={7} spellCheck={false} onChange={(event) => setEdit({ base: value, color: event.target.value })}
          aria-invalid={!validHex || undefined} placeholder="#22396F" className="min-w-0 flex-1" />
        <Button type="button" variant="outline" disabled={disabled || !validHex} onClick={() => onChange(draft)}>Apply</Button>
      </div>
    </div>}
  </div>;
}

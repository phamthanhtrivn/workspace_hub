"use client";

import React, { useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
  error?: string;
  description?: string;
}

export const OtpInput = React.memo(function OtpInput({
  length = 6,
  value,
  onChange,
  className,
  label = "Verification code",
  error,
  description,
}: OtpInputProps) {
  const id = React.useId();
  const [activeInput, setActiveInput] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newValue = value.split("");
      if (value[index]) {
        // If current box has a value, just delete it
        newValue[index] = "";
        onChange(newValue.join(""));
      } else if (index > 0) {
        // If empty, delete previous and move focus back
        newValue[index - 1] = "";
        onChange(newValue.join(""));
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const val = e.target.value;
    if (!/^[0-9]*$/.test(val)) return; // Only allow numbers

    // Native one-time-code autofill may enter the full code into one cell.
    if (val.length > 1) {
      const prefix = value.slice(0, index);
      const next = (prefix + val).slice(0, length);
      onChange(next);
      focusInput(Math.min(next.length, length - 1));
      return;
    }

    // Ordinary typing replaces the current digit.
    const char = val.slice(-1);

    const newValue = value.split("");
    newValue[index] = char;
    const finalValue = newValue.join("");
    onChange(finalValue);

    // Auto focus next
    if (char && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").slice(0, length);
    if (!/^[0-9]+$/.test(pastedData)) return;

    onChange(pastedData);

    // Focus the last filled input or the first empty one
    const focusIndex = Math.min(pastedData.length, length - 1);
    focusInput(focusIndex);
  };

  const focusInput = (index: number) => {
    setActiveInput(index);
    inputRefs.current[index]?.focus();
  };

  return (
    <div role="group" aria-label={label} aria-describedby={error || description ? `${id}-description` : undefined}>
    <div className={cn("flex justify-between items-center gap-2", className)}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          autoFocus={index === 0}
          aria-label={`${label}, digit ${index + 1} of ${length}`}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || description ? `${id}-description` : undefined}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          value={value[index] || ""}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          onFocus={() => setActiveInput(index)}
          className={cn(
            "min-w-0 w-12 h-14 text-center text-2xl font-semibold border-2 rounded-xl bg-transparent transition-all outline-none",
            "focus:border-primary focus:ring-2 focus:ring-ring",
            activeInput === index
              ? "border-primary"
              : "border-input dark:border-input",
          )}
        />
      ))}
    </div>
    {(error || description) && <p id={`${id}-description`} role={error ? "alert" : undefined} className={cn("mt-2 text-xs", error ? "text-destructive-content" : "text-muted-foreground")}>{error || description}</p>}
    </div>
  );
});

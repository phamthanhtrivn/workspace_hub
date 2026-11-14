"use client";

import { useId, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  APPEARANCE_COPY as copy,
  CUSTOM_COLOR_DEFAULT,
} from "./appearance.constants";
import {
  colorAreaPosition,
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
  type HsvColor,
} from "./color-picker.utils";

export function CustomColorEditor({
  value,
  onApply,
  onCancel,
}: {
  value: string;
  onApply: (color: string) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const initial = normalizeHexColor(value) ?? CUSTOM_COLOR_DEFAULT;
  const [hex, setHex] = useState(initial);
  const [hsv, setHsv] = useState(() => hexToHsv(initial));
  const normalized = normalizeHexColor(hex);
  const preview = hsvToHex(hsv);
  // These gradients describe the full HSV gamut, independent of UI theme tokens.
  const updateColor = (next: HsvColor) => {
    setHsv(next);
    setHex(hsvToHex(next));
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    updateColor({
      ...hsv,
      ...colorAreaPosition(
        event.clientX - bounds.left,
        event.clientY - bounds.top,
        bounds.width,
        bounds.height,
      ),
    });
  };
  const apply = () => {
    if (normalized) onApply(normalized);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{copy.customColor}</h3>
      <div
        tabIndex={0}
        role="slider"
        aria-label={copy.colorArea}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.saturation)}
        aria-valuetext={`${Math.round(hsv.saturation)}% saturation, ${Math.round(hsv.value)}% brightness`}
        aria-describedby={`${id}-hint`}
        className="relative h-36 cursor-crosshair touch-none rounded-control border border-input outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{
          backgroundColor: `hsl(${hsv.hue} 100% 50%)`,
          backgroundImage:
            "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
        onPointerDown={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            move(event);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          if (
            ![
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
              "End",
            ].includes(event.key)
          )
            return;
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          updateColor({
            ...hsv,
            saturation:
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 100
                  : Math.max(
                      0,
                      Math.min(
                        100,
                        hsv.saturation +
                          (event.key === "ArrowRight"
                            ? step
                            : event.key === "ArrowLeft"
                              ? -step
                              : 0),
                      ),
                    ),
            value: Math.max(
              0,
              Math.min(
                100,
                hsv.value +
                  (event.key === "ArrowUp"
                    ? step
                    : event.key === "ArrowDown"
                      ? -step
                      : 0),
              ),
            ),
          });
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ring-1 ring-black/40"
          style={{
            left: `${hsv.saturation}%`,
            top: `${100 - hsv.value}%`,
            backgroundColor: preview,
          }}
        />
      </div>
      <p id={`${id}-hint`} className="sr-only">
        {copy.colorAreaHint}
      </p>
      <div className="space-y-1.5">
        <label
          htmlFor={`${id}-hue`}
          className="text-xs font-medium text-muted-foreground"
        >
          {copy.hue}
        </label>
        <input
          id={`${id}-hue`}
          type="range"
          min={0}
          max={360}
          value={hsv.hue}
          onChange={(event) =>
            updateColor({ ...hsv, hue: Number(event.target.value) })
          }
          className="h-3 w-full cursor-pointer appearance-none rounded-full border border-input accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          style={{
            background:
              "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          }}
        />
      </div>
      <div className="flex items-end gap-3">
        <span
          aria-label={copy.preview}
          className="mb-0.5 size-9 shrink-0 rounded-control border border-input"
          style={{ backgroundColor: normalized ?? preview }}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor={`${id}-hex`}
            className="text-xs font-medium text-muted-foreground"
          >
            {copy.hex}
          </label>
          <Input
            id={`${id}-hex`}
            value={hex}
            maxLength={7}
            spellCheck={false}
            aria-invalid={!normalized}
            aria-describedby={!normalized ? `${id}-error` : undefined}
            onChange={(event) => {
              const draft = event.target.value;
              setHex(draft);
              const next = normalizeHexColor(draft);
              if (next) setHsv(hexToHsv(next));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                apply();
              }
            }}
          />
        </div>
      </div>
      {!normalized && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-destructive-content"
        >
          {copy.invalidHex}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="button" size="sm" disabled={!normalized} onClick={apply}>
          {copy.apply}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<SliderPrimitive.Root.Props, "className"> {
  className?: string;
  thumbProps?: Omit<SliderPrimitive.Thumb.Props, "index" | "className"> & { className?: string };
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbProps,
  ...props
}: SliderProps) {
  const values = value ?? defaultValue ?? [min];
  const thumbCount = Array.isArray(values) ? values.length : 1;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("w-full data-[vertical]:h-full data-[vertical]:w-auto", className)}
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control
        className="relative flex min-h-10 w-full touch-none select-none items-center data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[vertical]:h-full data-[vertical]:min-h-0 data-[vertical]:w-10 data-[vertical]:flex-col"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200 data-[vertical]:h-full data-[vertical]:w-2"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="rounded-full bg-[var(--color-primary)] data-[horizontal]:h-full data-[vertical]:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            index={index}
            data-slot="slider-thumb"
            {...thumbProps}
            className={cn(
              "block size-5 shrink-0 cursor-grab rounded-full border-2 border-[var(--color-primary)] bg-white shadow-sm outline-none transition-[box-shadow] hover:ring-4 hover:ring-[var(--color-primary)]/10 focus-visible:ring-4 focus-visible:ring-[var(--color-primary)]/20 active:cursor-grabbing data-[disabled]:cursor-not-allowed",
              thumbProps?.className,
            )}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };

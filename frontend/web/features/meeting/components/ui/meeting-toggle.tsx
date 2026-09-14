import type { LucideIcon } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface MeetingToggleProps {
  checked: boolean;
  title: string;
  description: string;
  icon: LucideIcon;
  variant?: "light" | "dark";
  disabled?: boolean;
  className?: string;
  onCheckedChange: (checked: boolean) => void;
}

export function MeetingToggle({
  checked,
  title,
  description,
  icon: Icon,
  variant = "light",
  disabled,
  className,
  onCheckedChange,
}: MeetingToggleProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg p-3 transition",
        isDark
          ? "bg-white/6 ring-1 ring-white/8 hover:bg-white/8"
          : "border border-slate-200 bg-slate-50/70 hover:border-blue-200 hover:bg-blue-50/70",
        disabled && "opacity-70",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-md shadow-sm",
            isDark ? "bg-white/8 text-blue-200" : "bg-white text-[#0052CC]",
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block text-sm font-black",
              isDark ? "text-slate-100" : "text-[#172B4D]",
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "mt-0.5 block text-xs font-semibold leading-5",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {description}
          </span>
        </span>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

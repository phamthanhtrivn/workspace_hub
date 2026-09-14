import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { MeetingButton } from "./meeting-form-controls";

interface MeetingIconButtonProps extends ComponentProps<typeof MeetingButton> {
  label: string;
  icon: LucideIcon;
}

export function MeetingIconButton({
  label,
  icon: Icon,
  className,
  ...props
}: MeetingIconButtonProps) {
  return (
    <MeetingButton
      type="button"
      tone="ghost"
      aria-label={label}
      title={label}
      className={cn("size-9 p-0", className)}
      {...props}
    >
      <Icon className="size-4" />
    </MeetingButton>
  );
}

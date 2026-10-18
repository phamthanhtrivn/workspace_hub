"use client";

import React from "react";
import { IconButton } from "@/components/ui/icon-button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocumentsIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  showTooltip?: boolean;
  active?: boolean;
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export const DocumentsIconButton = React.forwardRef<
  HTMLButtonElement,
  DocumentsIconButtonProps
>(({ icon: Icon, label, showTooltip = true, active = false, className, size = "icon", variant = "ghost", ...props }, ref) => {
  return (
    <IconButton
      ref={ref}
      label={label}
      showTooltip={showTooltip}
      variant={variant}
      size={size}
      aria-label={label}
      className={cn(
        "h-8 w-8 cursor-pointer rounded-control text-muted-foreground transition hover:bg-muted hover:text-foreground border border-transparent hover:border-border",
        active && "bg-card text-link border-border font-semibold",
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </IconButton>
  );
});

DocumentsIconButton.displayName = "DocumentsIconButton";

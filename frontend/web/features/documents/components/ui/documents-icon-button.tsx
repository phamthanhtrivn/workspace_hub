"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const button = (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      aria-label={label}
      className={cn(
        "h-8 w-8 cursor-pointer rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 border border-transparent hover:border-slate-200/60",
        active && "bg-white text-[var(--color-primary)] shadow-xs border-slate-200 font-bold",
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  if (!showTooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent className="border-slate-100 bg-white text-slate-700 font-bold shadow-md">
        {label}
      </TooltipContent>
    </Tooltip>
  );
});

DocumentsIconButton.displayName = "DocumentsIconButton";

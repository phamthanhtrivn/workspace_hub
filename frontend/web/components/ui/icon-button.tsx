import type { ComponentProps } from "react";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export interface IconButtonProps extends ComponentProps<typeof Button> {
  label: string;
  showTooltip?: boolean;
}

export function IconButton({ label, showTooltip = true, size = "icon", variant = "ghost", children, ...props }: IconButtonProps) {
  const button = <Button type="button" aria-label={label} size={size} variant={variant} {...props}>{children}</Button>;
  if (!showTooltip) return button;
  return <Tooltip><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

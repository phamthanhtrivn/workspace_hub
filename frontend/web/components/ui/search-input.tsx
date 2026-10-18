import type { ComponentProps } from "react";
import { Search, X } from "lucide-react";
import { Input } from "./input";
import { IconButton } from "./icon-button";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends ComponentProps<typeof Input> {
  onClear?: () => void;
  clearLabel?: string;
  containerClassName?: string;
  iconClassName?: string;
  clearClassName?: string;
}

export function SearchInput({ onClear, clearLabel = "Clear search", containerClassName, iconClassName, clearClassName, className, value, ...props }: SearchInputProps) {
  return <div className={cn("relative min-w-0", containerClassName)}>
    <Search aria-hidden className={cn("pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground", iconClassName)} />
    <Input type="text" role="searchbox" value={value} className={cn("pl-9 pr-9 [@media(pointer:coarse)]:pr-14", className)} {...props} />
    {value && onClear ? <IconButton label={clearLabel} disabled={props.disabled} showTooltip={false} variant="unstyled" onClick={onClear} className={cn("absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-control text-muted-foreground hover:text-foreground", clearClassName)}><X aria-hidden className="size-3.5" /></IconButton> : null}
  </div>;
}

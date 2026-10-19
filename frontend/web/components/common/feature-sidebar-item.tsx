import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureSidebarItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function FeatureSidebarItem({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: FeatureSidebarItemProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/sidebar-item h-12 min-w-0 shrink-0 justify-start gap-3 rounded-control px-3 text-sm font-medium focus-visible:ring-inset motion-reduce:transition-none [&_svg]:size-[18px]",
        active
          ? "bg-primary-soft font-semibold text-primary-soft-foreground hover:bg-primary-soft hover:text-primary-soft-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-control transition-colors duration-150 motion-reduce:transition-none",
          active
            ? "bg-background text-primary-soft-foreground"
            : "bg-transparent text-muted-foreground group-hover/sidebar-item:bg-background group-hover/sidebar-item:text-foreground group-focus-visible/sidebar-item:bg-background group-focus-visible/sidebar-item:text-foreground",
        )}
      >
        <Icon aria-hidden="true" />
      </span>
      <span className="min-w-0 truncate text-left">{label}</span>
    </Button>
  );
}

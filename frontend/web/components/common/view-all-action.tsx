import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewAllActionProps {
  label: ReactNode;
  appearance?: "inline" | "row";
  href?: ComponentProps<typeof Link>["href"];
  onClick?: () => void;
  "aria-label"?: string;
  className?: string;
}

export function ViewAllAction({
  label,
  appearance = "inline",
  href,
  onClick,
  "aria-label": ariaLabel,
  className,
}: ViewAllActionProps) {
  const isRow = appearance === "row";
  const Icon = isRow ? ChevronRight : ArrowUpRight;
  const actionClassName = cn(
    "min-w-0 max-w-full text-xs font-medium motion-reduce:transition-none",
    isRow
      ? "h-9 w-full justify-between gap-2 bg-info-soft px-3 text-info-content hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
      : "h-8 gap-1 bg-transparent px-0 text-muted-foreground hover:text-link [&_svg]:size-3.5",
    className,
  );
  const content = (
    <>
      <span className="min-w-0 truncate">{label}</span>
      <Icon aria-hidden="true" />
    </>
  );

  if (href !== undefined) {
    return (
      <Button asChild variant={isRow ? "ghost" : "link"} size="sm" className={actionClassName}>
        <Link href={href} onClick={onClick} aria-label={ariaLabel}>
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={isRow ? "ghost" : "link"}
      size="sm"
      className={actionClassName}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {content}
    </Button>
  );
}

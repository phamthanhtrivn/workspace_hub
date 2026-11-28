import { FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectColorStyle } from "../../utils/project-color.utils";

const PROJECT_ICON_SIZE_CLASSES = {
  sm: "size-6 rounded-md text-sm",
  md: "size-10 rounded-control text-xl",
  lg: "size-11 rounded-control text-xl",
} as const;

interface ProjectIdentityIconProps {
  icon?: string | null;
  color?: string | null;
  size?: keyof typeof PROJECT_ICON_SIZE_CLASSES;
  className?: string;
}

export function ProjectIdentityIcon({
  icon,
  color,
  size = "md",
  className,
}: ProjectIdentityIconProps) {
  return (
    <span
      aria-hidden="true"
      style={getProjectColorStyle(color)}
      className={cn(
        "grid shrink-0 place-items-center border border-[color-mix(in_srgb,var(--project-color)_55%,var(--border))] bg-[color-mix(in_srgb,var(--project-color)_24%,var(--card))] leading-none text-foreground",
        PROJECT_ICON_SIZE_CLASSES[size],
        className,
      )}
    >
      {icon || <FolderKanban className="size-1/2" strokeWidth={2} />}
    </span>
  );
}

export function ProjectColorDot({ color }: { color?: string | null }) {
  return (
    <span
      aria-hidden="true"
      style={getProjectColorStyle(color)}
      className="size-2 shrink-0 rounded-full bg-[var(--project-color)] ring-1 ring-inset ring-foreground/15"
    />
  );
}

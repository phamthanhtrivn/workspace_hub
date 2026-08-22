import { Code2, ListTodo } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { ProjectType } from "@/features/project/types/project";

const typeConfig = {
  [ProjectType.GENERAL]: {
    labelId: "project.type.general",
    icon: ListTodo,
    className: "bg-slate-100 text-slate-600",
  },
  [ProjectType.SOFTWARE_DEVELOPMENT]: {
    labelId: "project.type.software",
    icon: Code2,
    className: "bg-indigo-50 text-indigo-700",
  },
} satisfies Record<
  ProjectType,
  { labelId: string; icon: typeof Code2; className: string }
>;

export function ProjectTypeBadge({
  type,
  compact = false,
}: {
  type?: ProjectType;
  compact?: boolean;
}) {
  const intl = useAppIntl();
  const config = typeConfig[type || ProjectType.GENERAL];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${compact ? "text-[10px]" : "text-xs"} font-bold ${config.className}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {intl.formatMessage({ id: config.labelId })}
    </span>
  );
}

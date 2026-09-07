import { TaskStatus } from "@/features/project/types/project";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { TASK_STATUS_COLORS } from "@/features/project/constants/task.constants";

export interface StatusCounts {
  todo: number;
  progress: number;
  done: number;
}

const STATUS_ITEMS = [
  { key: "todo" as const, status: TaskStatus.TODO },
  { key: "progress" as const, status: TaskStatus.IN_PROGRESS },
  { key: "done" as const, status: TaskStatus.DONE },
] as const;

export function StatusCircles({ counts }: { counts: StatusCounts }) {
  const intl = useAppIntl();
  return (
    <div className="ml-3 flex items-center gap-1 text-[10px] font-bold">
      {STATUS_ITEMS.map(({ key, status }) => {
        const config = TASK_STATUS_COLORS[status];
        return (
          <span
            key={key}
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full ${config.bg} px-1.5 ${config.text}`}
            title={intl.formatMessage({ id: config.labelId })}
          >
            {counts[key]}
          </span>
        );
      })}
    </div>
  );
}

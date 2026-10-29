import Link from "next/link";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { TaskReference, WorkOverview, WorkTask } from "../types";
export function taskHref(source: TaskReference) {
  if (source.kind === "project" && source.projectId)
    return "/projects/" + source.projectId + "?taskId=" + source.id;
  const timestamp = /[?&]t=(\d+)/.exec(source.url)?.[1];
  return (
    "/calendar?eventId=" + source.id + (timestamp ? "&t=" + timestamp : "")
  );
}
export function taskReason(task: WorkTask) {
  if (task.overdue) return "Đã quá hạn";
  if (task.dueToday) return "Đến hạn hôm nay";
  if (task.blockedBy.length)
    return "Đang bị chặn bởi " + task.blockedBy.length + " task";
  if (task.priority === "URGENT") return "Mức ưu tiên khẩn cấp";
  if (task.priority === "HIGH") return "Mức ưu tiên cao";
  if (task.unblocks) return "Có " + task.unblocks + " công việc phụ thuộc";
  return task.dueAt ? "Cần chuẩn bị trước deadline" : "Chưa có deadline";
}
const stateText = {
  ready: "Đã cập nhật",
  empty: "Chưa có dữ liệu",
  partial: "Chi tiết chưa đầy đủ",
  unavailable: "Chưa truy cập được",
};
export default function WorkToday({
  data,
  onAsk,
  disabled = false,
}: {
  data: WorkOverview;
  onAsk: (question: string) => void;
  disabled?: boolean;
}) {
  return (
    <Collapsible className="border-b bg-muted/25" defaultOpen>
      <CollapsibleTrigger className="w-full cursor-pointer px-4 py-3 text-left text-sm font-semibold">
        Hôm nay · {data.date}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 px-4 pb-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>
              Project: {data.metrics.project?.open ?? "—"} việc còn mở
            </span>
            {!data.scope.projectId && (
              <span>Cá nhân: {data.metrics.personal?.open ?? "—"} việc</span>
            )}
            <span>
              Tập trung của bạn (7 ngày):{" "}
              {data.metrics.focusSeconds === null
                ? "—"
                : Math.round(data.metrics.focusSeconds / 60) + " phút"}
            </span>
          </div>
          <div className="space-y-2">
            {data.tasks.slice(0, 4).map((task) => (
              <Link
                key={task.kind + task.id}
                href={taskHref(task)}
                className="block rounded-lg border bg-background p-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {taskReason(task)}
                  {task.dueAt
                    ? " · " +
                      new Intl.DateTimeFormat("vi-VN", {
                        timeZone: data.timeZone,
                        day: "2-digit",
                        month: "2-digit",
                        ...(task.allDay
                          ? {}
                          : {
                              hour: "2-digit" as const,
                              minute: "2-digit" as const,
                            }),
                      }).format(
                        new Date(
                          Date.parse(task.dueAt) -
                            (task.kind === "calendar" && task.allDay ? 1 : 0),
                        ),
                      )
                    : ""}
                </p>
              </Link>
            ))}
          </div>
          {!data.tasks.length && (
            <p className="text-xs text-muted-foreground">
              {data.sources.project.state === "unavailable" ||
              data.sources.calendar.state === "unavailable"
                ? "Chưa đủ dữ liệu để tổng hợp công việc."
                : "Không có task chưa hoàn thành trong dữ liệu hiện có."}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Project: {stateText[data.sources.project.state]} · Calendar:{" "}
            {stateText[data.sources.calendar.state]}
          </p>
          {data.detailPartial && (
            <p className="text-xs text-muted-foreground">
              Chỉ hiển thị một phần chi tiết task. Các tổng số được tính trên
              toàn bộ dữ liệu được phép xem.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Gợi ý thời gian dựa trên lịch Calendar của bạn.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Hôm nay nên làm gì trước?",
              "Task nào có nguy cơ trễ hạn?",
              "Phân tích hiệu suất 7 ngày qua",
              "Gợi ý thời gian làm việc theo Calendar",
            ].map((question) => (
              <Button
                key={question}
                type="button"
                size="sm"
                variant="outline"
                className="h-auto min-h-8 whitespace-normal px-3 py-2 text-left leading-relaxed"
                disabled={disabled}
                onClick={() => onAsk(question)}
              >
                {question}
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Cập nhật{" "}
            {new Intl.DateTimeFormat("vi-VN", {
              timeZone: data.timeZone,
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(data.fetchedAt))}{" "}
            · {data.timeZone}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

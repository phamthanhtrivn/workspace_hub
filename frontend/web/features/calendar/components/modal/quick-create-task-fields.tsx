import { ListTodo, Paperclip, Target } from "lucide-react";
import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { getDateInputValue } from "../../utils/calendar-date.utils";
import { QuickRow } from "./quick-create-time-section";

export function QuickCreateTaskFields({ startAt }: { startAt: string }) {
  const intl = useAppIntl();
  const [deadline, setDeadline] = useState(() => getDateInputValue(startAt));
  const [taskList, setTaskList] = useState("my-tasks");
  const [files, setFiles] = useState<string[]>([]);

  return (
    <>
      <QuickRow icon={<Target className="h-5 w-5" />}>
        <label className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-200/60">
          <span className="text-sm text-slate-600">
            {intl.formatMessage({ id: "calendar.quick.deadline" })}
          </span>
          <input
            type="date"
            aria-label={intl.formatMessage({ id: "calendar.quick.deadline" })}
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none"
          />
        </label>
      </QuickRow>
      <QuickRow icon={<ListTodo className="h-5 w-5" />}>
        <select
          value={taskList}
          aria-label={intl.formatMessage({ id: "calendar.quick.myTasks" })}
          onChange={(event) => setTaskList(event.target.value)}
          className="w-full cursor-pointer rounded-lg border-0 bg-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none"
        >
          <option value="my-tasks">
            {intl.formatMessage({ id: "calendar.quick.myTasks" })}
          </option>
          <option value="project-tasks">
            {intl.formatMessage({ id: "calendar.quick.projectTasks" })}
          </option>
        </select>
      </QuickRow>
      <QuickRow icon={<Paperclip className="h-5 w-5" />}>
        <label className="block cursor-pointer rounded-lg px-2 py-2.5 text-sm text-slate-600 transition hover:bg-slate-200/60">
          <input
            type="file"
            multiple
            className="sr-only"
            aria-label={intl.formatMessage({ id: "calendar.quick.addFile" })}
            onChange={(event) =>
              setFiles(
                Array.from(event.target.files || []).map((file) => file.name),
              )
            }
          />
          <span className="font-medium">
            {intl.formatMessage({ id: "calendar.quick.addFile" })}
          </span>
          {files.length > 0 && (
            <span className="mt-1 block truncate text-xs text-slate-500">
              {files.join(", ")}
            </span>
          )}
        </label>
      </QuickRow>
    </>
  );
}

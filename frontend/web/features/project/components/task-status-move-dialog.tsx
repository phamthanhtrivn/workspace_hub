"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { ArrowRight } from "lucide-react";
import type { TaskStatus } from "@/features/project/types/project";

export type TaskStatusMoveDialogState = {
  taskId: string;
  taskTitle: string;
  fromStatus: string;
  toStatus: string;
  targetStatus: TaskStatus;
};

export default function TaskStatusMoveDialog({
  state,
  onClose,
  onConfirm,
}: {
  state: TaskStatusMoveDialogState | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[80] bg-slate-950/45 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
        <AlertDialog.Viewport className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <AlertDialog.Popup className="w-full max-w-[440px] rounded-xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] transition-[transform,opacity] duration-200 data-[starting-style]:translate-y-2 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:translate-y-2 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 motion-reduce:transition-none">
            <div className="flex items-start gap-3.5 border-b border-slate-100 px-5 py-4.5">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#0052CC]"
              >
                <ArrowRight className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <AlertDialog.Title className="text-base font-bold text-[#172B4D]">
                  Chuyển trạng thái công việc?
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-1 text-xs leading-5 text-slate-500">
                  Xác nhận trước khi cập nhật công việc trên bảng Kanban.
                </AlertDialog.Description>
              </div>
            </div>

            <div className="px-5 py-4.5">
              <p className="truncate text-sm font-semibold text-slate-700">
                {state?.taskTitle}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600">
                  {state?.fromStatus}
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[#0052CC]"
                />
                <span
                  className="rounded-md bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-[#0052CC]"
                >
                  {state?.toStatus}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
              <AlertDialog.Close className="rounded-md px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
                Hủy
              </AlertDialog.Close>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0052CC] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0747A6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2"
              >
                Xác nhận
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

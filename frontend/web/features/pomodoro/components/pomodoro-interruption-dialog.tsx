"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  PhoneCall,
  MessageSquare,
  Coffee,
  Users,
  Compass,
  AlertTriangle,
} from "lucide-react";

interface PomodoroInterruptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReason: (reason: string) => void;
}

const INTERRUPTION_REASONS = [
  {
    id: "phone",
    label: "Cuộc gọi khẩn cấp",
    icon: PhoneCall,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    id: "message",
    label: "Trả lời tin nhắn / Email",
    icon: MessageSquare,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    id: "colleague",
    label: "Đồng nghiệp trao đổi / Họp đột xuất",
    icon: Users,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    id: "fatigue",
    label: "Mệt mỏi / Đi lấy nước / Vệ sinh",
    icon: Coffee,
    color: "text-cyan-600 bg-cyan-50 border-cyan-200",
  },
  {
    id: "distraction",
    label: "Mất tập trung / Lướt web",
    icon: Compass,
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  {
    id: "other",
    label: "Nguyên nhân khác",
    icon: AlertTriangle,
    color: "text-slate-600 bg-slate-50 border-slate-200",
  },
];

export function PomodoroInterruptionDialog({
  isOpen,
  onClose,
  onSelectReason,
}: PomodoroInterruptionDialogProps) {
  const handlePick = (label: string) => {
    onSelectReason(label);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Ghi nhận lý do gián đoạn
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Dữ liệu này giúp bạn phân tích các tác nhân gây xao nhãng thường gặp nhất để cải thiện nhịp độ làm việc.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {INTERRUPTION_REASONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePick(item.label)}
                className={`flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition-all hover:scale-[1.02] hover:shadow-xs active:scale-95 ${item.color}`}
              >
                <Icon className="size-5 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

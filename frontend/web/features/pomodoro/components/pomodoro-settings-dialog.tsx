"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Volume2 } from "lucide-react";
import type { PomodoroConfig } from "../types/pomodoro";
import { playPomodoroSound } from "../utils/sound";

interface PomodoroSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: PomodoroConfig;
  onSaveConfig: (newConfig: PomodoroConfig) => void;
}

export function PomodoroSettingsDialog({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}: PomodoroSettingsDialogProps) {
  const [form, setForm] = useState<PomodoroConfig>(config);

  const handleTestSound = () => {
    playPomodoroSound(form.soundType, form.soundVolume);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(form);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            Cài đặt Pomodoro
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          {/* Time Durations */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Thời lượng (Phút)
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  🎯 Focus
                </label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={form.focusDuration}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      focusDuration: Math.max(1, parseInt(e.target.value) || 25),
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  ☕ Nghỉ ngắn
                </label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={form.shortBreak}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      shortBreak: Math.max(1, parseInt(e.target.value) || 5),
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  🌴 Nghỉ dài
                </label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={form.longBreak}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      longBreak: Math.max(1, parseInt(e.target.value) || 15),
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Intervals & Goal */}
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Chu kỳ nghỉ dài
              </label>
              <Input
                type="number"
                min={1}
                max={12}
                value={form.longBreakInterval}
                onChange={(e) =>
                  setForm({
                    ...form,
                    longBreakInterval: Math.max(1, parseInt(e.target.value) || 4),
                  })
                }
                className="h-9 text-xs"
              />
              <span className="text-[10px] text-slate-400">
                Nghỉ dài sau X phiên tập trung
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mục tiêu hàng ngày
              </label>
              <Input
                type="number"
                min={1}
                max={30}
                value={form.dailyGoalPomodoros}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dailyGoalPomodoros: Math.max(1, parseInt(e.target.value) || 8),
                  })
                }
                className="h-9 text-xs"
              />
              <span className="text-[10px] text-slate-400">
                Số quả Pomodoro mỗi ngày
              </span>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Âm thanh & Thông báo
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Âm thanh chuông báo
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Phát chuông êm dịu khi kết thúc phiên
                  </div>
                </div>
                <Switch
                  checked={form.soundEnabled}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, soundEnabled: checked })
                  }
                />
              </div>

              {form.soundEnabled && (
                <div className="flex items-center gap-2">
                  <select
                    value={form.soundType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        soundType: e.target.value as "chime" | "bell" | "digital",
                      })
                    }
                    className="flex-1 h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="chime">Chuông thiền Zen Chime</option>
                    <option value="bell">Chuông Tây Tạng Tibetan Bell</option>
                    <option value="digital">Digital Beep</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestSound}
                    className="h-9 px-3 text-xs"
                  >
                    <Volume2 className="size-3.5 mr-1" /> Thử âm
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Thông báo trình duyệt
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Báo khi bạn đang ở tab khác hoặc ứng dụng khác
                  </div>
                </div>
                <Switch
                  checked={form.notificationEnabled}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, notificationEnabled: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Automation toggles */}
          <div className="border-t border-slate-100 pt-3 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Tự động hóa
            </h4>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Tự động bắt đầu Giờ nghỉ
                </div>
                <div className="text-[11px] text-slate-400">
                  Tự chuyển sang giờ giải lao khi hết phiên Focus
                </div>
              </div>
              <Switch
                checked={form.autoStartBreak}
                onCheckedChange={(checked) =>
                  setForm({ ...form, autoStartBreak: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Tự động bắt đầu Tập trung
                </div>
                <div className="text-[11px] text-slate-400">
                  Tự bắt đầu phiên Focus mới khi hết giờ nghỉ
                </div>
              </div>
              <Switch
                checked={form.autoStartFocus}
                onCheckedChange={(checked) =>
                  setForm({ ...form, autoStartFocus: checked })
                }
              />
            </div>
          </div>

          <DialogFooter className="mt-4 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs font-semibold bg-[var(--color-primary,#1C4D8D)] text-white"
            >
              Lưu cài đặt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

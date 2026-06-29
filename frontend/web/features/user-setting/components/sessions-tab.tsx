"use client";

import { useState, useEffect } from "react";
import { Monitor, Smartphone, LogOut, Loader2 } from "lucide-react";
import { UserSession } from "@/features/user-setting/types/user-setting.types";
import {
  getUserSessions,
  revokeUserSession,
} from "@/features/user-setting/api/user-setting.api";
import RevokeSessionModal from "./revoke-session-modal";

export default function SessionsTab() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const response = await getUserSessions();
      if (response && response.success) {
        setSessions(response.data);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeClick = (sessionId: string) => {
    setRevokingSessionId(sessionId);
  };

  const handleConfirmRevoke = async (password: string) => {
    if (!revokingSessionId) return;

    // The error will be caught by the modal
    const res = await revokeUserSession(revokingSessionId, password);
    if (res && res.success) {
      setRevokingSessionId(null);
      loadSessions(); // Reload list
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  console.log(sessions);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <h3 className="text-2xl font-black text-slate-800">Phiên đăng nhập</h3>
      <p className="text-sm font-semibold text-slate-500">
        Quản lý các thiết bị đang đăng nhập vào tài khoản của bạn.
      </p>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                {session.operatingSystem?.toLowerCase().includes("mac") ||
                session.operatingSystem?.toLowerCase().includes("windows") ? (
                  <Monitor className="h-5 w-5" />
                ) : (
                  <Smartphone className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  {session.deviceName || "Thiết bị không xác định"}
                  {session.currentSession && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">
                      Thiết bị hiện tại
                    </span>
                  )}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {session.platform || "Nền tảng không xác định"}
                </p>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  {session.location || session.ipAddress} • Hết hạn:{" "}
                  {new Date(session.expiresAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>

            {!session.currentSession && (
              <button
                onClick={() => handleRevokeClick(session.id)}
                className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                Đăng xuất
              </button>
            )}
          </div>
        ))}

        {sessions.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            Không có phiên đăng nhập nào.
          </p>
        )}
      </div>

      <RevokeSessionModal
        isOpen={!!revokingSessionId}
        onClose={() => setRevokingSessionId(null)}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
}

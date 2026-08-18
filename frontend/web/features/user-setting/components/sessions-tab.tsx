"use client";

import React, { useState } from "react";
import { Loader2, LogOut, Monitor, Smartphone } from "lucide-react";
import { UserDeviceKeyword } from "@/features/user-setting/types/settings.enums";
import {
  useRevokeUserSessionMutation,
  useUserSessionsQuery,
} from "@/features/user-setting/hooks/useUserSettingQueries";
import RevokeSessionModal from "./revoke-session-modal";

const SessionsTab = React.memo(function SessionsTab() {
  const { data: sessionsResponse, isLoading } = useUserSessionsQuery();
  const revokeSessionMutation = useRevokeUserSessionMutation();
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
    null,
  );

  const sessions = sessionsResponse?.data ?? [];

  const handleConfirmRevoke = async (password: string) => {
    if (!revokingSessionId) return;

    const response = await revokeSessionMutation.mutateAsync({
      sessionId: revokingSessionId,
      password,
    });

    if (response.success) {
      setRevokingSessionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <h3 className="text-2xl font-black text-slate-800">Signed-in sessions</h3>
      <p className="text-sm font-semibold text-slate-500">
        Manage the devices currently signed in to your account.
      </p>

      <div className="space-y-3">
        {sessions.map((session) => {
          const operatingSystem = session.operatingSystem?.toLowerCase() ?? "";
          const isDesktop =
            operatingSystem.includes(UserDeviceKeyword.MAC) ||
            operatingSystem.includes(UserDeviceKeyword.WINDOWS);

          return (
            <div
              key={session.id}
              className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                  {isDesktop ? (
                    <Monitor className="h-5 w-5" />
                  ) : (
                    <Smartphone className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    {session.deviceName || "Unknown device"}
                    {session.currentSession && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">
                        Current device
                      </span>
                    )}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {session.platform || "Unknown platform"}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    {session.location || session.ipAddress} • Expires:{" "}
                    {new Date(session.expiresAt).toLocaleDateString("en-US")}
                  </p>
                </div>
              </div>

              {!session.currentSession && (
                <button
                  onClick={() => setRevokingSessionId(session.id)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  Sign out
                </button>
              )}
            </div>
          );
        })}

        {sessions.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No signed-in sessions found.
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
});

export default SessionsTab;

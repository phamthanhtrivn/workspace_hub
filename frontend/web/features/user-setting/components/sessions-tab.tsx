"use client";

import React, { useState } from "react";
import { Loader2, LogOut, Monitor, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <Loader2 className="h-8 w-8 animate-spin text-link" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <h3 className="text-section-title font-semibold text-foreground">Signed-in sessions</h3>
      <p className="text-sm font-semibold text-muted-foreground">
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
              className="flex flex-col gap-4 rounded-panel border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  {isDesktop ? (
                    <Monitor className="h-5 w-5" />
                  ) : (
                    <Smartphone className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {session.deviceName || "Unknown device"}
                    {session.currentSession && (
                      <Badge className="bg-success-soft text-success-content hover:bg-success-soft border-none font-semibold uppercase text-xs px-1.5 py-0.5">
                        Current device
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {session.platform || "Unknown platform"}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {session.location || session.ipAddress} • Expires:{" "}
                    {new Date(session.expiresAt).toLocaleDateString("en-US")}
                  </p>
                </div>
              </div>

              {!session.currentSession && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRevokingSessionId(session.id)}
                  className="flex items-center justify-center gap-2 rounded-control border-border bg-destructive-soft text-xs font-semibold text-destructive-content hover:bg-destructive-soft hover:text-destructive-content cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  Sign out
                </Button>
              )}
            </div>
          );
        })}

        {sessions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
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

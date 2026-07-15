"use client";

import { useState } from "react";
import { CalendarDays, Check, Inbox, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  usePendingProjectInvitations,
  useRespondProjectInvitation,
} from "@/features/project/hooks/use-invitations";

function formatDate(value?: string): string {
  if (!value) return "Không có thời hạn";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function InvitationsPage() {
  const { data: invitations = [], isLoading, isError } =
    usePendingProjectInvitations();
  const respondMutation = useRespondProjectInvitation();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const respond = async (invitationId: string, action: "accept" | "decline") => {
    setProcessingId(invitationId);
    try {
      await respondMutation.mutateAsync({ invitationId, action });
      toast.success(
        action === "accept" ? "Đã tham gia project" : "Đã từ chối lời mời",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xử lý lời mời",
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-6 sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
          Workspace
        </p>
        <h1 className="mt-2 text-2xl font-black text-[var(--color-primary-dark)]">
          Lời mời vào project
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-400">
          Xem và phản hồi những lời mời bạn nhận được.
        </p>
      </div>

      {isLoading && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white py-20 text-center text-sm font-semibold text-slate-400">
          Đang tải lời mời...
        </div>
      )}

      {isError && (
        <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 py-20 text-center text-sm font-semibold text-red-500">
          Không thể tải danh sách lời mời.
        </div>
      )}

      {!isLoading && !isError && invitations.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <Inbox className="h-7 w-7" />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-600">
            Bạn chưa có lời mời nào
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Những lời mời mới sẽ xuất hiện ở đây.
          </p>
        </div>
      )}

      {!isLoading && !isError && invitations.length > 0 && (
        <div className="mt-8 space-y-3">
          {invitations.map((invitation) => {
            const isProcessing = processingId === invitation.id;
            return (
              <div
                key={invitation.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-[var(--color-primary-dark)]">
                    {invitation.projectName}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Bạn được mời tham gia project này với vai trò thành viên.
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Hết hạn: {formatDate(invitation.expiresAt)}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => void respond(invitation.id, "decline")}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => void respond(invitation.id, "accept")}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary-dark)] px-3 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isProcessing ? "Đang xử lý..." : "Đồng ý"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

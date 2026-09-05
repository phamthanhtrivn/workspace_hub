"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyProjectInvitations } from "../api/invitation.api";
import { useRespondProjectInvitation } from "../hooks/use-invitations";

export default function ProjectInvitationsScreen({ invitationId }: { invitationId?: string }) {
  const query = useQuery({ queryKey: ["projects", "invitations", "mine"], queryFn: getMyProjectInvitations });
  const respond = useRespondProjectInvitation();
  const invitations = (query.data ?? []).filter((item) => !invitationId || item.id === invitationId);
  const handleRespond = async (id: string, action: "accept" | "decline") => {
    try {
      const result = await respond.mutateAsync({ invitationId: id, action });
      toast.success(action === "accept" ? "Đã tham gia dự án" : "Đã từ chối lời mời");
      if (action === "accept") window.location.assign(`/projects/${result.projectId}`);
    } catch { toast.error("Không thể phản hồi. Lời mời có thể đã hết hạn hoặc đã được xử lý."); }
  };
  return <main className="mx-auto w-full max-w-2xl space-y-4 p-6">
    <h1 className="text-xl font-bold text-slate-800">Lời mời tham gia dự án</h1>
    <Link href="/projects" className="text-sm text-blue-600 underline">Về danh sách dự án</Link>
    {query.isLoading ? <p>Đang tải lời mời…</p> : query.isError ? <p role="alert">Không thể tải lời mời. <button type="button" onClick={() => void query.refetch()} className="underline">Thử lại</button></p>
      : !invitations.length ? <p className="rounded border border-slate-200 p-4 text-sm text-slate-600">Không còn lời mời đang chờ. Lời mời có thể đã được xử lý, hết hạn hoặc thuộc tài khoản khác.</p>
      : invitations.map((invitation) => <section key={invitation.id} className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-800">{invitation.projectName}</h2>
        {invitation.expiresAt && <p className="mt-1 text-sm text-slate-500">Hết hạn: {new Date(invitation.expiresAt).toLocaleString("vi-VN")}</p>}
        <div className="mt-4 flex gap-3">
          <button type="button" disabled={respond.isPending} onClick={() => void handleRespond(invitation.id, "accept")} className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">Tham gia</button>
          <button type="button" disabled={respond.isPending} onClick={() => void handleRespond(invitation.id, "decline")} className="rounded border border-slate-200 px-4 py-2 text-sm disabled:opacity-50">Từ chối</button>
        </div>
      </section>)}
  </main>;
}

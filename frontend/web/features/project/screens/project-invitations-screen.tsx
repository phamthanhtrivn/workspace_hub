"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyProjectInvitations } from "../api/invitation.api";
import { useRespondProjectInvitation } from "../hooks/use-invitations";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export default function ProjectInvitationsScreen({ invitationId }: { invitationId?: string }) {
  const intl = useAppIntl();
  const query = useQuery({ queryKey: ["projects", "invitations", "mine"], queryFn: getMyProjectInvitations });
  const respond = useRespondProjectInvitation();
  const invitations = (query.data ?? []).filter((item) => !invitationId || item.id === invitationId);
  const handleRespond = async (id: string, action: "accept" | "decline") => {
    try {
      const result = await respond.mutateAsync({ invitationId: id, action });
      toast.success(intl.formatMessage({ id: action === "accept" ? "project.invitation.accepted" : "project.invitation.declined" }));
      if (action === "accept") window.location.assign(`/projects/${result.projectId}`);
    } catch { toast.error(intl.formatMessage({ id: "project.invitation.respondFailed" })); }
  };
  return <main className="mx-auto w-full max-w-2xl space-y-4 p-6">
    <h1 className="text-xl font-bold text-slate-800">{intl.formatMessage({ id: "project.invitation.title" })}</h1>
    <Link href="/projects" className="text-sm text-blue-600 underline">{intl.formatMessage({ id: "project.invitation.backToProjects" })}</Link>
    {query.isLoading ? <p>{intl.formatMessage({ id: "project.invitation.loading" })}</p> : query.isError ? <p role="alert">{intl.formatMessage({ id: "project.invitation.loadFailed" })} <button type="button" onClick={() => void query.refetch()} className="underline">{intl.formatMessage({ id: "project.common.retry" })}</button></p>
      : !invitations.length ? <p className="rounded border border-slate-200 p-4 text-sm text-slate-600">{intl.formatMessage({ id: "project.invitation.empty" })}</p>
      : invitations.map((invitation) => <section key={invitation.id} className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-800">{invitation.projectName}</h2>
        {invitation.expiresAt && <p className="mt-1 text-sm text-slate-500">{intl.formatMessage({ id: "project.invitation.expiresAt" }, { date: intl.formatDate(new Date(invitation.expiresAt), { dateStyle: "medium", timeStyle: "short" }) })}</p>}
        <div className="mt-4 flex gap-3">
          <button type="button" disabled={respond.isPending} onClick={() => void handleRespond(invitation.id, "accept")} className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{intl.formatMessage({ id: "project.invitation.accept" })}</button>
          <button type="button" disabled={respond.isPending} onClick={() => void handleRespond(invitation.id, "decline")} className="rounded border border-slate-200 px-4 py-2 text-sm disabled:opacity-50">{intl.formatMessage({ id: "project.invitation.decline" })}</button>
        </div>
      </section>)}
  </main>;
}

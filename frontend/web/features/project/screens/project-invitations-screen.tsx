"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyProjectInvitations } from "../api/invitation.api";
import { useRespondProjectInvitation } from "../hooks/use-invitations";
import { Button } from "@/components/ui/button";

export default function ProjectInvitationsScreen({
  invitationId,
}: {
  invitationId?: string;
}) {
  const query = useQuery({
    queryKey: ["projects", "invitations", "mine"],
    queryFn: getMyProjectInvitations,
  });
  const respond = useRespondProjectInvitation();
  const invitations = (query.data ?? []).filter(
    (item) => !invitationId || item.id === invitationId,
  );

  const handleRespond = async (id: string, action: "accept" | "decline") => {
    try {
      const result = await respond.mutateAsync({ invitationId: id, action });
      toast.success(
        action === "accept"
          ? "Project invitation accepted"
          : "Project invitation declined",
      );
      if (action === "accept") {
        window.location.assign(`/projects/${result.projectId}`);
      }
    } catch {
      toast.error("Failed to respond to project invitation");
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-bold text-slate-800">Project Invitations</h1>
      <Link href="/projects" className="text-sm font-semibold text-[#0052CC] hover:underline">
        ← Back to Projects
      </Link>
      {query.isLoading ? (
        <p className="text-xs text-slate-500">Loading invitations...</p>
      ) : query.isError ? (
        <p role="alert" className="text-xs text-red-600">
          Failed to load invitations.{" "}
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => void query.refetch()}
            className="h-auto p-0 font-bold underline text-red-600 hover:text-red-700 cursor-pointer"
          >
            Retry
          </Button>
        </p>
      ) : !invitations.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-xs">
          You have no pending project invitations.
        </div>
      ) : (
        invitations.map((invitation) => (
          <section
            key={invitation.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
          >
            <h2 className="text-base font-bold text-slate-800">
              {invitation.projectName}
            </h2>
            {invitation.expiresAt && (
              <p className="text-xs text-slate-500">
                Expires on:{" "}
                {new Date(invitation.expiresAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
            <div className="flex gap-2.5 pt-1">
              <Button
                type="button"
                disabled={respond.isPending}
                onClick={() => void handleRespond(invitation.id, "accept")}
                className="bg-[#0052CC] hover:bg-[#0747A6] text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
              >
                Accept
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={respond.isPending}
                onClick={() => void handleRespond(invitation.id, "decline")}
                className="border-slate-200 text-slate-700 font-bold text-xs h-9 px-4 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Decline
              </Button>
            </div>
          </section>
        ))
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyProjectInvitations } from "../api/invitation.api";
import { useRespondProjectInvitation } from "../hooks/use-invitations";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";

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
      <h1 className="text-page-title font-semibold text-foreground">Project Invitations</h1>
      <Link href="/projects" className="text-sm font-semibold text-info-content hover:underline">
        ← Back to Projects
      </Link>
      {query.isLoading ? (
        <LoadingState label="Loading invitations..." className="text-xs text-muted-foreground" />
      ) : query.isError ? (
        <p role="alert" className="text-xs text-destructive-content">
          Failed to load invitations.{" "}
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => void query.refetch()}
            className="h-auto p-0 font-semibold underline text-destructive-content hover:text-destructive-content cursor-pointer"
          >
            Retry
          </Button>
        </p>
      ) : !invitations.length ? (
        <div className="rounded-panel border border-border bg-card p-6 text-center text-sm font-semibold text-muted-foreground">
          You have no pending project invitations.
        </div>
      ) : (
        invitations.map((invitation) => (
          <section
            key={invitation.id}
            className="rounded-panel border border-border bg-card p-5 space-y-3"
          >
            <h2 className="text-section-title font-semibold text-foreground">
              {invitation.projectName}
            </h2>
            {invitation.expiresAt && (
              <p className="text-xs text-muted-foreground">
                Expires on:{" "}
                {new Date(invitation.expiresAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
            <div className="flex gap-2.5 pt-1">
              <Button loading={respond.isPending && respond.variables?.invitationId === invitation.id && respond.variables?.action === "accept"}
                type="button"
                disabled={respond.isPending}
                onClick={() => void handleRespond(invitation.id, "accept")}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs h-9 px-4 rounded-control cursor-pointer"
              >
                Accept
              </Button>
              <Button loading={respond.isPending && respond.variables?.invitationId === invitation.id && respond.variables?.action === "decline"}
                type="button"
                variant="outline"
                disabled={respond.isPending}
                onClick={() => void handleRespond(invitation.id, "decline")}
                className="border-border text-foreground font-semibold text-xs h-9 px-4 rounded-control hover:bg-background cursor-pointer"
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

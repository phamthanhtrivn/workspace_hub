"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Clock3, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { searchUsers, type UserSearchResult } from "@/features/project/api/user.api";
import type { ProjectInvitationWithUser } from "@/features/project/api/invitation.api";
import { useCreateProjectInvitation } from "@/features/project/hooks/use-invitations";
import type { ProjectMember } from "@/features/project/types/project";
import { getProjectErrorMessage } from "@/features/project/project-error-message";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function InviteMemberDialog({
  open,
  projectId,
  members,
  pendingInvitations,
  onClose,
}: {
  open: boolean;
  projectId: string;
  members: ProjectMember[];
  pendingInvitations: ProjectInvitationWithUser[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createInvitationMutation = useCreateProjectInvitation(projectId);
  const memberIds = useMemo(() => new Set(members.map((member) => member.userId)), [members]);
  const pendingIds = useMemo(() => new Set(pendingInvitations.map((item) => item.invitedUserId)), [pendingInvitations]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!open || selectedUser || normalizedQuery.length < 2) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const users = await searchUsers(normalizedQuery);
        if (!active) return;
        const availableUsers = users.filter((user) => !memberIds.has(user.id));
        setResults(availableUsers);
        if (availableUsers.length === 0) {
          setSearchError("No users found matching your search.");
        }
      } catch (error) {
        if (!active) return;
        setResults([]);
        setSearchError(getProjectErrorMessage(error, "Failed to search users."));
      } finally {
        if (active) setIsSearching(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [memberIds, open, query, selectedUser]);

  const handleSubmit = async () => {
    if (!selectedUser || createInvitationMutation.isPending) return;

    try {
      await createInvitationMutation.mutateAsync(selectedUser.id);
      const name = selectedUser.fullName || selectedUser.email;
      setSuccessMessage(`Invitation sent to ${name}. You can continue inviting more members.`);
      setQuery("");
      setSelectedUser(null);
      setResults([]);
      toast.success("Project invitation sent successfully");
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      toast.error(getProjectErrorMessage(error, "Failed to send invitation"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-w-lg flex-col p-0 gap-0 overflow-hidden rounded-dialog border-border bg-card">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-4 pr-12 text-left border-b border-border">
          <DialogTitle className="text-section-title font-semibold text-foreground">
            Invite Project Member
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs font-semibold text-muted-foreground">
            Search for colleagues by name or email to invite them to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {successMessage && (
            <div className="mb-4 flex gap-2.5 rounded-panel border border-border bg-success-soft px-3.5 py-3 text-xs font-semibold text-success-content">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Name or Email
            </span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setQuery(nextQuery);
                  setSelectedUser(null);
                  setSearchError("");
                  setSuccessMessage("");
                  if (nextQuery.trim().length < 2) {
                    setIsSearching(false);
                    setResults([]);
                  }
                }}
                placeholder="Type at least 2 characters to search..."
                className="w-full rounded-control border-input py-2.5 pl-9 pr-9 text-xs font-semibold placeholder:text-muted-foreground"
                autoComplete="off"
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setQuery("");
                    setSelectedUser(null);
                    setResults([]);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-control text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </span>
          </label>

          <div className="mt-3 min-h-28 max-h-60 overflow-y-auto pr-1">
            {query.trim().length < 2 && (
              <div className="grid min-h-28 place-items-center rounded-panel border border-dashed border-border bg-background px-5 text-center">
                <p className="text-xs font-semibold leading-5 text-muted-foreground">
                  Search by full name or email address to find people in your organization.
                </p>
              </div>
            )}
            {isSearching && (
              <div className="space-y-2" aria-label="Searching users...">
                {[0, 1].map((item) => (
                  <div key={item} className="flex animate-pulse items-center gap-3 rounded-panel border border-border p-3">
                    <span className="h-9 w-9 rounded-full bg-muted" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-3 w-1/3 rounded bg-muted" />
                      <span className="block h-2.5 w-1/2 rounded bg-muted" />
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!isSearching && searchError && query.trim().length >= 2 && (
              <div className="grid min-h-28 place-items-center rounded-panel bg-background px-5 text-center text-xs font-semibold text-muted-foreground">
                {searchError}
              </div>
            )}
            {!isSearching && results.length > 0 && (
              <div className="space-y-2">
                {results.map((user) => {
                  const isPending = pendingIds.has(user.id);
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <Button
                      key={user.id}
                      type="button"
                      variant="ghost"
                      onClick={() => !isPending && setSelectedUser(user)}
                      disabled={isPending}
                      className={cn(
                        "flex h-auto w-full cursor-pointer items-center justify-start gap-3 rounded-control border p-3 text-left transition duration-150 font-normal",
                        isPending
                          ? "cursor-default border-border bg-warning-soft/60 hover:bg-warning-soft/60"
                          : isSelected
                            ? "border-primary bg-info-soft hover:bg-info-soft"
                            : "border-border hover:border-input hover:bg-background"
                      )}
                    >
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="h-9 w-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                          <User className="h-4 w-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {user.fullName || "User"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </span>
                      {isPending ? (
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-content border-border"
                        >
                          <Clock3 className="h-3 w-3" /> Pending
                        </Badge>
                      ) : isSelected ? (
                        <Badge
                          variant="outline"
                          className="border-primary bg-primary text-primary-foreground text-xs font-semibold"
                        >
                          Selected
                        </Badge>
                      ) : null}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-5 py-4">
          <p className="text-xs font-semibold text-muted-foreground">
            {pendingInvitations.length === 1
              ? "1 pending invitation"
              : `${pendingInvitations.length} pending invitations`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer rounded-control font-semibold text-muted-foreground hover:bg-muted"
            >
              Close
            </Button>
            <Button loading={createInvitationMutation.isPending}
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!selectedUser || createInvitationMutation.isPending}
              className="cursor-pointer rounded-control bg-primary font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
            >
              {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

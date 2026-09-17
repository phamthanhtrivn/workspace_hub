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
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 text-left border-b border-slate-100">
          <DialogTitle className="text-lg font-bold text-slate-900">
            Invite Project Member
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs font-semibold text-slate-500">
            Search for colleagues by name or email to invite them to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          {successMessage && (
            <div className="mb-4 flex gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Name or Email
            </span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                className="w-full rounded-xl border-slate-200 py-2.5 pl-9 pr-9 text-xs font-semibold placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-[#0052CC]/15"
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
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </span>
          </label>

          <div className="mt-3 min-h-28 max-h-60 overflow-y-auto pr-1">
            {query.trim().length < 2 && (
              <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
                <p className="text-xs font-semibold leading-5 text-slate-400">
                  Search by full name or email address to find people in your organization.
                </p>
              </div>
            )}
            {isSearching && (
              <div className="space-y-2" aria-label="Searching users...">
                {[0, 1].map((item) => (
                  <div key={item} className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <span className="h-9 w-9 rounded-full bg-slate-100" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-3 w-1/3 rounded bg-slate-100" />
                      <span className="block h-2.5 w-1/2 rounded bg-slate-100" />
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!isSearching && searchError && query.trim().length >= 2 && (
              <div className="grid min-h-28 place-items-center rounded-xl bg-slate-50 px-5 text-center text-xs font-semibold text-slate-400">
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
                        "flex h-auto w-full cursor-pointer items-center justify-start gap-3 rounded-xl border p-3 text-left transition duration-150 font-normal",
                        isPending
                          ? "cursor-default border-amber-100 bg-amber-50/60 hover:bg-amber-50/60"
                          : isSelected
                            ? "border-[#0052CC] bg-blue-50 shadow-xs hover:bg-blue-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
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
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">
                          <User className="h-4 w-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-700">
                          {user.fullName || "User"}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {user.email}
                        </span>
                      </span>
                      {isPending ? (
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 border-amber-200"
                        >
                          <Clock3 className="h-3 w-3" /> Pending
                        </Badge>
                      ) : isSelected ? (
                        <Badge
                          variant="outline"
                          className="border-[#0052CC] bg-[#0052CC] text-white text-[10px] font-bold"
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

        <DialogFooter className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <p className="text-[11px] font-semibold text-slate-400">
            {pendingInvitations.length === 1
              ? "1 pending invitation"
              : `${pendingInvitations.length} pending invitations`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer rounded-xl font-bold text-slate-600 hover:bg-slate-100"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!selectedUser || createInvitationMutation.isPending}
              className="cursor-pointer rounded-xl bg-[#0052CC] font-bold text-white shadow-sm hover:bg-[#0747A6] disabled:opacity-40"
            >
              {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

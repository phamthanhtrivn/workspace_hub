"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import Image from "next/image";
import { UserSearchResponse } from "@/features/chat/types/chat.types";
import {
  inviteSpaceMembers,
  searchUserByEmail,
} from "@/features/chat/api/chat.api";

interface InviteSpaceMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onInvited?: () => void;
}

export default function InviteSpaceMembersModal({
  isOpen,
  onClose,
  spaceId,
  onInvited,
}: InviteSpaceMembersModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserSearchResponse[]>([]);
  const [error, setError] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResponse[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const currentUserId = useAppSelector((state) => state.auth.userId);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setResults([]);
      setError("");
      setSelectedUsers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!email.trim()) {
      setResults([]);
      setError("");
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [email, selectedUsers]);

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await searchUserByEmail(email);
      const users = response?.success ? response.data : [];

      const filtered = users.filter(
        (u: UserSearchResponse) =>
          u.id !== currentUserId &&
          !selectedUsers.some((selected) => selected.id === u.id),
      );
      setResults(filtered);

      if (filtered.length === 0 && users.length > 0) {
        setError("Selected user is already added");
      } else if (filtered.length === 0) {
        setError("User not found");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to search user",
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: UserSearchResponse) => {
    setSelectedUsers((prev) => [...prev, user]);
    setEmail("");
    setResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleInvite = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user to invite");
      return;
    }
    if (!spaceId) {
      toast.error("Space information missing");
      return;
    }

    setIsInviting(true);
    try {
      await inviteSpaceMembers(spaceId, selectedUsers);
      toast.success("Space invitations sent successfully");
      onInvited?.();
      onClose();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to send invitations",
      );
    } finally {
      setIsInviting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/40 animate-fade-in">
      <div className={`${dialogLayout.surface} w-full max-w-md bg-card rounded-panel border border-border flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-section-title font-semibold text-foreground">
            Invite Members to Space
          </h2>
          <button aria-label="Close"
            onClick={onClose}
            className="p-1 rounded-control text-muted-foreground hover:text-muted-foreground hover:bg-muted transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={`${dialogLayout.body} p-6 flex flex-col gap-4 overflow-y-auto`}>
          {/* Selected Users Chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-background rounded-panel border border-border max-h-24 overflow-y-auto">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-1.5 bg-info-soft border border-border text-info-content text-xs px-2.5 py-1 rounded-lg"
                >
                  <span>
                    {user.fullName} ({user.email})
                  </span>
                  <button aria-label="Remove selected member"
                    type="button"
                    onClick={() => handleRemoveUser(user.id)}
                    className="hover:bg-info-soft rounded text-info-content hover:text-info-content p-0.5 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="text"
              placeholder="Enter user email to search..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-transparent focus:border-info-outline focus:bg-card rounded-control text-sm outline-none transition"
            />
          </div>

          {/* Results List */}
          <div className="min-h-[120px] max-h-[200px] overflow-y-auto flex flex-col gap-1 border border-border rounded-panel p-1">
            {loading ? (
              <div className="flex justify-center items-center py-6 text-muted-foreground text-xs gap-1.5">
                <Loader2 size={14} className="animate-spin text-info-content" />
                Searching...
              </div>
            ) : results.length > 0 ? (
              results.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="flex items-center justify-between p-2 hover:bg-background rounded-lg cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-info-soft rounded-full flex items-center justify-center overflow-hidden border border-border">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt="Avatar"
                          width={28}
                          height={28}
                          className="rounded-full animate-fade-in object-cover"
                        />
                      ) : (
                        <User size={13} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">
                        {user.fullName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                {error}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Enter an email address to search for workspace members.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-background">
          <button
            type="button"
            onClick={onClose}
            disabled={isInviting}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-control transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={isInviting || selectedUsers.length === 0}
            className="px-5 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary disabled:bg-primary rounded-control transition flex items-center gap-1.5 cursor-pointer"
          >
            {isInviting && <Loader2 size={16} className="animate-spin" />}
            Send Invitation
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}


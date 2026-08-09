"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, User, Loader2 } from "lucide-react";
import { searchUserByEmail, inviteSpaceMembers } from "../../api/chat.api";
import { UserSearchResponse } from "../../types/chat.types";
import { toast } from "react-toastify";
import { useAppSelector } from "@/store/store";

interface InviteGroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
}

export default function InviteGroupMembersModal({
  isOpen,
  onClose,
  spaceId,
}: InviteGroupMembersModalProps) {
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
          !selectedUsers.some((selected) => selected.id === u.id)
      );
      setResults(filtered);

      if (filtered.length === 0 && users.length > 0) {
        setError("This user is already selected");
      } else if (filtered.length === 0) {
        setError("User not found");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred while searching");
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
      const userIds = selectedUsers.map((u) => u.id);
      await inviteSpaceMembers(spaceId, userIds);
      toast.success("Space invitation sent successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "An error occurred while inviting");
    } finally {
      setIsInviting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Invite members to space</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          {/* Selected Users Chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-xl border border-gray-100 max-h-24 overflow-y-auto">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-lg"
                >
                  <span>{user.fullName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUser(user.id)}
                    className="hover:bg-blue-100 rounded text-blue-500 hover:text-blue-700 p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Enter user email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl text-sm outline-none transition"
            />
          </div>

          {/* Results List */}
          <div className="min-h-[120px] max-h-[200px] overflow-y-auto flex flex-col gap-1 border border-gray-100 rounded-xl p-1">
            {loading ? (
              <div className="flex justify-center items-center py-6 text-gray-400 text-xs gap-1.5">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                Searching...
              </div>
            ) : results.length > 0 ? (
              results.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
                      {(user.fullName || "U").substring(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-800">{user.fullName}</span>
                      <span className="text-[10px] text-slate-400">{user.email}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="text-center py-8 text-xs text-gray-400">{error}</div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-400">Enter email to search for members</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isInviting}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={isInviting || selectedUsers.length === 0}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            {isInviting && <Loader2 size={16} className="animate-spin" />}
            Send invitation
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import { useEffect, useState } from "react";
import { Search, User, X } from "lucide-react";
import { toast } from "react-toastify";
import { searchUsersByEmail, type UserSearchResult } from "@/features/project/api/user.api";
import { useCreateProjectInvitation } from "@/features/project/hooks/use-invitations";

export default function InviteMemberDialog({
  open,
  projectId,
  onClose,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const createInvitationMutation = useCreateProjectInvitation(projectId);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setResults([]);
    setSearchError("");
    setSelectedUser(null);
  }, [open]);

  useEffect(() => {
    if (!open || selectedUser || email.trim().length < 2) {
      setResults([]);
      setSearchError("");
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const users = await searchUsersByEmail(email.trim());
        setResults(users);
        if (users.length === 0) setSearchError("Không tìm thấy người dùng phù hợp");
      } catch (error) {
        setResults([]);
        setSearchError(
          error instanceof Error ? error.message : "Không thể tìm người dùng",
        );
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [email, open, selectedUser]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!selectedUser || createInvitationMutation.isPending) return;

    try {
      await createInvitationMutation.mutateAsync(selectedUser.id);
      toast.success("Đã gửi lời mời vào project");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể gửi lời mời",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-[var(--color-primary-dark)]">
              Mời thành viên
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Người được mời sẽ cần đồng ý trước khi vào project.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="relative mt-5 block">
          <span className="mb-1.5 block text-xs font-bold text-slate-600">
            Tìm bằng email
          </span>
          <Search className="absolute left-3 top-10 h-4 w-4 text-slate-400" />
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setSelectedUser(null);
            }}
            placeholder="nhap-email@example.com"
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
            autoFocus
          />
        </label>

        <div className="mt-3 min-h-20">
          {isSearching && (
            <p className="py-5 text-center text-xs font-semibold text-slate-400">
              Đang tìm kiếm...
            </p>
          )}
          {!isSearching && searchError && (
            <p className="py-5 text-center text-xs font-semibold text-slate-400">
              {searchError}
            </p>
          )}
          {!isSearching && results.length > 0 && (
            <div className="space-y-2">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUser(user)}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                    selectedUser?.id === user.id
                      ? "border-[var(--color-secondary)] bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-700">
                      {user.fullName || "Người dùng"}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {user.email}
                    </span>
                  </span>
                  {selectedUser?.id === user.id && (
                    <span className="text-xs font-bold text-[var(--color-secondary)]">
                      Đã chọn
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!selectedUser || createInvitationMutation.isPending}
            className="rounded-xl bg-[var(--color-primary-dark)] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {createInvitationMutation.isPending ? "Đang gửi..." : "Gửi lời mời"}
          </button>
        </div>
      </div>
    </div>
  );
}

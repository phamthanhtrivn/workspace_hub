"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Clock3, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { searchUsers, type UserSearchResult } from "@/features/project/api/user.api";
import type { ProjectInvitationWithUser } from "@/features/project/api/invitation.api";
import { useCreateProjectInvitation } from "@/features/project/hooks/use-invitations";
import type { ProjectMember } from "@/features/project/types/project";

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
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

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
          setSearchError("Không tìm thấy người dùng chưa tham gia Project này.");
        }
      } catch (error) {
        if (!active) return;
        setResults([]);
        setSearchError(error instanceof Error ? error.message : "Không thể tìm người dùng");
      } finally {
        if (active) setIsSearching(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [memberIds, open, query, selectedUser]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!selectedUser || createInvitationMutation.isPending) return;

    try {
      await createInvitationMutation.mutateAsync(selectedUser.id);
      const name = selectedUser.fullName || selectedUser.email;
      setSuccessMessage(`Đã gửi lời mời cho ${name}. Bạn có thể tiếp tục mời người khác.`);
      setQuery("");
      setSelectedUser(null);
      setResults([]);
      toast.success("Đã gửi lời mời vào Project");
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi lời mời");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="invite-member-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="invite-member-title" className="text-lg font-black text-[var(--color-primary-dark)]">Mời thành viên</h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Tìm tài khoản theo tên hoặc email. Lời mời sẽ xuất hiện trong chuông thông báo của họ.
              </p>
            </div>
            <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {successMessage && (
            <div className="mb-4 flex gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">Tên hoặc email</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
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
                placeholder="Ví dụ: Nguyễn An hoặc an@example.com"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-slate-300 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
                autoComplete="off"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); setSelectedUser(null); setResults([]); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100" aria-label="Xóa tìm kiếm">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          </label>

          <div className="mt-3 min-h-28 max-h-64 overflow-y-auto pr-1">
            {query.trim().length < 2 && (
              <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
                <p className="text-xs font-semibold leading-5 text-slate-400">
                  Nhập ít nhất 2 ký tự để tìm người dùng.<br />Thành viên hiện tại sẽ tự động được ẩn.
                </p>
              </div>
            )}
            {isSearching && (
              <div className="space-y-2" aria-label="Đang tìm kiếm">
                {[0, 1].map((item) => (
                  <div key={item} className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <span className="h-9 w-9 rounded-full bg-slate-100" />
                    <span className="flex-1 space-y-2"><span className="block h-3 w-1/3 rounded bg-slate-100" /><span className="block h-2.5 w-1/2 rounded bg-slate-100" /></span>
                  </div>
                ))}
              </div>
            )}
            {!isSearching && searchError && query.trim().length >= 2 && (
              <div className="grid min-h-28 place-items-center rounded-xl bg-slate-50 px-5 text-center text-xs font-semibold text-slate-400">{searchError}</div>
            )}
            {!isSearching && results.length > 0 && (
              <div className="space-y-2">
                {results.map((user) => {
                  const isPending = pendingIds.has(user.id);
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => !isPending && setSelectedUser(user)}
                      disabled={isPending}
                      className={["flex w-full items-center gap-3 rounded-xl border p-3 text-left transition", isPending ? "cursor-default border-amber-100 bg-amber-50/60" : isSelected ? "border-[var(--color-secondary)] bg-blue-50 shadow-sm" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"].join(" ")}
                    >
                      {user.avatarUrl ? (
                        <Image src={user.avatarUrl} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-400"><User className="h-4 w-4" /></span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-700">{user.fullName || "Người dùng"}</span>
                        <span className="block truncate text-xs text-slate-400">{user.email}</span>
                      </span>
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700"><Clock3 className="h-3 w-3" /> Đang chờ</span>
                      ) : isSelected ? (
                        <span className="text-xs font-bold text-[var(--color-secondary)]">Đã chọn</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <p className="text-[11px] font-semibold text-slate-400">
            {pendingInvitations.length > 0 ? `${pendingInvitations.length} lời mời đang chờ phản hồi` : "Chưa có lời mời đang chờ"}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-200/70">Đóng</button>
            <button type="button" onClick={() => void handleSubmit()} disabled={!selectedUser || createInvitationMutation.isPending} className="rounded-xl bg-[var(--color-primary-dark)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
              {createInvitationMutation.isPending ? "Đang gửi..." : "Gửi lời mời"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

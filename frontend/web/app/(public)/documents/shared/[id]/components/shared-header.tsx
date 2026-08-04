"use client";

import React from "react";
import Link from "next/link";

interface SharedHeaderProps {
  isLoggedIn: boolean;
}

export function SharedHeader({ isLoggedIn }: SharedHeaderProps) {
  return (
    <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4.5 flex items-center justify-between shadow-xs">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/10">
          W
        </div>
        <span className="text-sm font-black text-slate-800 tracking-tight">WorkspaceHub</span>
      </Link>
      {isLoggedIn ? (
        <Link
          href="/documents"
          className="rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 text-xs font-black transition-all cursor-pointer"
        >
          Vào Workspace
        </Link>
      ) : (
        <Link
          href="/login"
          className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-black transition-all cursor-pointer shadow-md shadow-blue-500/10"
        >
          Đăng nhập
        </Link>
      )}
    </header>
  );
}

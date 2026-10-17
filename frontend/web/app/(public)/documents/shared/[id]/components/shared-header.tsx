"use client";

import React from "react";
import Link from "next/link";

interface SharedHeaderProps {
  isLoggedIn: boolean;
}

export function SharedHeader({ isLoggedIn }: SharedHeaderProps) {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-40 px-6 py-4.5 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-panel bg-primary flex items-center justify-center text-primary-foreground font-semibold">
          W
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">WorkspaceHub</span>
      </Link>
      {isLoggedIn ? (
        <Link
          href="/documents"
          className="rounded-panel border border-border hover:bg-background text-muted-foreground px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
        >
          Vào Workspace
        </Link>
      ) : (
        <Link
          href="/login"
          className="rounded-panel bg-primary hover:bg-primary text-primary-foreground px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
        >
          Đăng nhập
        </Link>
      )}
    </header>
  );
}

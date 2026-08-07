"use client";

import React from "react";
import { Lock } from "lucide-react";
import Link from "next/link";

export function SharedDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center flex flex-col items-center justify-center">
        <div className="bg-red-50 p-4 rounded-full text-red-500 mb-4">
          <Lock size={36} />
        </div>
        <h2 className="text-lg font-black text-slate-800">Truy cập bị từ chối</h2>
        <p className="text-sm text-slate-400 font-semibold mt-2 leading-relaxed">
          Bạn không có quyền truy cập tài liệu này hoặc liên kết chia sẻ đã hết hạn.
        </p>
        <div className="flex flex-col gap-2 w-full mt-6">
          <Link
            href="/login"
            className="flex items-center justify-center w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white py-3 text-xs font-black transition-all cursor-pointer shadow-md shadow-blue-500/10"
          >
            Đăng nhập để kiểm tra quyền
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center w-full rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50 py-3 text-xs font-black transition-all cursor-pointer"
          >
            Trở về Trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

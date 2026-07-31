"use client";

import React from "react";

export default function ShimmerLoader() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Folder Section Shimmer */}
      <div>
        <div className="h-5 w-32 bg-slate-200 rounded-lg mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={`folder-shimmer-${i}`}
              className="flex items-center gap-3 p-4 border border-slate-100 rounded-2xl bg-slate-50/30"
            >
              <div className="h-10 w-10 bg-slate-200 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 w-2/3 bg-slate-200 rounded-lg mb-2" />
                <div className="h-3 w-1/3 bg-slate-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* File Section Shimmer */}
      <div>
        <div className="h-5 w-24 bg-slate-200 rounded-lg mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={`file-shimmer-${i}`}
              className="flex flex-col p-4 border border-slate-100 rounded-2xl bg-slate-50/30"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 bg-slate-200 rounded-xl" />
                <div className="h-7 w-7 bg-slate-200 rounded-lg" />
              </div>
              <div className="h-4 w-3/4 bg-slate-200 rounded-lg mb-2" />
              <div className="h-3 w-1/2 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

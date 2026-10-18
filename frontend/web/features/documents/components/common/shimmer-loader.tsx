"use client";

import React from "react";

function ShimmerLoader() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Folder Section Shimmer */}
      <div>
        <div className="h-5 w-32 bg-accent rounded-lg mb-4" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={`folder-shimmer-${i}`}
              className="flex items-center gap-3 p-4 border border-border rounded-panel bg-background"
            >
              <div className="h-10 w-10 bg-accent rounded-panel" />
              <div className="flex-1">
                <div className="h-4 w-2/3 bg-accent rounded-lg mb-2" />
                <div className="h-3 w-1/3 bg-accent rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* File Section Shimmer */}
      <div>
        <div className="h-5 w-24 bg-accent rounded-lg mb-4" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={`file-shimmer-${i}`}
              className="flex flex-col p-4 border border-border rounded-panel bg-background"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 bg-accent rounded-panel" />
                <div className="h-7 w-7 bg-accent rounded-lg" />
              </div>
              <div className="h-4 w-3/4 bg-accent rounded-lg mb-2" />
              <div className="h-3 w-1/2 bg-accent rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(ShimmerLoader);

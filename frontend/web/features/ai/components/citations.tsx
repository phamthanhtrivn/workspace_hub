"use client";

import { useState } from "react";
import { notebooksApi } from "../api/notebooks.api";
import type { Citation } from "../types";

export function Citations({
  items,
  notebookId,
}: {
  items: Citation[];
  notebookId: string;
}) {
  const [error, setError] = useState("");
  const preview = async (citation: Citation) => {
    setError("");
    const viewer = window.open("about:blank", "_blank");
    if (viewer) viewer.opener = null;
    // Open only after the server rechecks the exact pinned version and current permissions.
    try {
      const { url } = await notebooksApi.source(
        notebookId,
        citation.sourceId,
        "preview",
      );
      if (!url || !["https:", "http:"].includes(new URL(url).protocol))
        throw new Error();
      if (!viewer) throw new Error();
      viewer.location.href = `${url}${citation.page ? `#page=${citation.page}` : ""}`;
    } catch {
      viewer?.close();
      setError(
        "Không mở được nguồn. Kiểm tra quyền, phiên bản và cho phép cửa sổ mới trong trình duyệt.",
      );
    }
  };
  return (
    <div className="mt-3 space-y-2 text-xs">
      {items.map((item) => (
        <details
          key={`${item.label}-${item.id}`}
          className="rounded-md border bg-slate-50 p-2"
        >
          <summary className="cursor-pointer break-words font-medium">
            [{item.label}] {item.name} ·{" "}
            {item.page ? `trang ${item.page}` : `đoạn ${item.position + 1}`}
          </summary>
          <blockquote className="my-2 whitespace-pre-wrap break-words border-l-2 pl-3 leading-relaxed">
            {item.text}
          </blockquote>
          <button
            type="button"
            className="text-primary underline"
            onClick={() => preview(item)}
          >
            Mở bản gốc
          </button>
        </details>
      ))}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

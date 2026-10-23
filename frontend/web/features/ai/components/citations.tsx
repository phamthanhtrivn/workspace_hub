"use client";
import { Button } from "@/components/ui/button";

import { useId, useState } from "react";
import Image from "next/image";
import { notebooksApi } from "../api/notebooks.api";
import type { Citation } from "../types";
import { AnswerContent } from "./answer-content";

export function Citations({
  items,
  notebookId,
  content,
  markdown = true,
}: {
  items: Citation[];
  notebookId: string;
  content?: string;
  markdown?: boolean;
}) {
  const prefix = useId();
  const byLabel = new Map(items.map((item) => [item.label, item]));
  const sourceId = (item: Citation) => `${prefix}-${item.label}-${item.id}`;
  const showSource = (item: Citation) => {
    const details = document.getElementById(
      sourceId(item),
    ) as HTMLDetailsElement | null;
    if (!details) return;
    details.open = true;
    details.scrollIntoView({ block: "nearest" });
    details.querySelector("summary")?.focus({ preventScroll: true });
  };
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
    <div
      className={content === undefined ? "mt-3 space-y-2 text-xs" : "space-y-3"}
    >
      {content !== undefined &&
        (markdown ? (
          <AnswerContent
            content={content}
            renderCitation={(label) => {
              const item = byLabel.get(label);
              if (!item) return `[[${label}]]`;
              const description = `Nguồn ${item.label}: ${item.name}${item.page ? `, trang ${item.page}` : ""}`;
              return (
                <button
                  type="button"
                  title={description}
                  aria-label={description}
                  onClick={() => showSource(item)}
                  className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-primary/20 bg-primary/5 px-1 align-super text-[10px] font-semibold leading-none text-primary transition-colors hover:border-primary/40 hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {item.label.slice(1)}
                </button>
              );
            }}
          />
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-7">
            {content}
          </div>
        ))}
      {items.length > 0 && (
        <div className="space-y-2 text-xs">
          <p className="font-medium text-muted-foreground">Nguồn tham khảo</p>
          {items.map((item) => (
            <details
              key={`${item.label}-${item.id}`}
              id={sourceId(item)}
              className="rounded-md border bg-slate-50 p-2"
            >
              <summary className="cursor-pointer break-words font-medium">
                <span className="mr-1.5 inline-flex min-w-5 items-center justify-center rounded border border-primary/20 bg-primary/5 px-1 py-0.5 text-[10px] font-semibold text-primary">
                  {item.label.slice(1)}
                </span>
                {item.name} ·{" "}
                {item.page ? `trang ${item.page}` : `đoạn ${item.position + 1}`}
              </summary>
              <blockquote className="my-2 whitespace-pre-wrap break-words border-l-2 pl-3 leading-relaxed">
                {item.text}
              </blockquote>
              {item.imageId && (
                <SourceImage notebookId={notebookId} citation={item} />
              )}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => preview(item)}
              >
                Mở bản gốc
              </button>
            </details>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function SourceImage({
  notebookId,
  citation,
}: {
  notebookId: string;
  citation: Citation;
}) {
  const [dataUrl, setDataUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    if (!citation.imageId) return;
    setPending(true);
    setError("");
    try {
      const image = await notebooksApi.sourceImage(
        notebookId,
        citation.sourceId,
        citation.imageId,
      );
      if (
        image.dataUrl.length > 1_400_000 ||
        !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(image.dataUrl)
      )
        throw new Error();
      setDataUrl(image.dataUrl);
    } catch {
      setError(
        "Không mở được hình. Nguồn có thể đã thay đổi hoặc mất quyền truy cập.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="my-3 space-y-2">
      {dataUrl ? (
        <Image
          unoptimized
          src={dataUrl}
          width={2000}
          height={2000}
          alt={`Hình từ ${citation.name}${citation.page ? `, trang ${citation.page}` : ""}`}
          className="h-auto w-full rounded-md border bg-white"
        />
      ) : (
        <Button
          loading={pending}
          variant="unstyled"
          type="button"
          disabled={pending}
          onClick={load}
          className="inline-flex items-center gap-2 text-primary underline disabled:opacity-50"
        >
          {pending ? "Đang mở hình…" : "Xem hình trích xuất"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

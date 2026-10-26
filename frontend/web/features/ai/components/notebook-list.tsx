"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/store/store";
import { notebooksApi } from "../api/notebooks.api";
import { LoadingState } from "@/components/ui/loading-state";

export function NotebookList() {
  const userId = useAppSelector((state) => state.auth.userId);
  const router = useRouter();
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const key = ["notebook-ai", userId];
  const query = useQuery({
    queryKey: key,
    queryFn: notebooksApi.list,
    enabled: Boolean(userId),
    retry: false,
    gcTime: 0,
  });
  const create = useMutation({
    mutationFn: () => notebooksApi.create(title.trim()),
    onSuccess: async (notebook) => {
      await client.invalidateQueries({ queryKey: key });
      router.push(`/ai/notebooks/${notebook.id}`);
    },
  });
  return (
    <main className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Không gian nghiên cứu
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Notebook của bạn</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tập hợp tài liệu, hỏi đáp theo nguồn và lưu điều bạn khám phá.
          Notebook chỉ dành cho bạn.
        </p>
      </header>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <Input
          className="max-w-md"
          aria-label="Tên notebook mới"
          placeholder="Tên chủ đề nghiên cứu…"
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button loading={create.isPending} disabled={!title.trim() || create.isPending || !userId}>
          <Plus />
          {create.isPending ? "Đang tạo…" : "Tạo notebook"}
        </Button>
      </form>
      {(query.isError || create.isError) && (
        <p role="alert" className="text-sm text-red-700">
          Không kết nối được Notebook AI. Kiểm tra service đã bật và đăng nhập
          lại nếu cần.
          <Button variant="link" onClick={() => query.refetch()}>
            Thử lại
          </Button>
        </p>
      )}
      {query.isPending && <LoadingState label="Đang tải notebook…" />}
      {!query.isError && query.data?.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-muted-foreground">
          Chưa có notebook. Tạo notebook đầu tiên để thêm tài liệu.
        </p>
      )}
      {!query.isError && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data?.map((notebook) => (
            <Link
              href={`/ai/notebooks/${notebook.id}`}
              key={notebook.id}
              className="rounded-xl border bg-white p-6 transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              <BookOpen className="mb-5 size-6 text-primary" />
              <h2 className="break-words font-semibold">{notebook.title}</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(notebook.updated_at).toLocaleDateString("vi-VN")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

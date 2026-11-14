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
    onSuccess: (notebook) => {
      router.push(`/ai/notebooks/${notebook.id}`);
      void client.invalidateQueries({ queryKey: key }).catch(() => {});
    },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Your notebooks</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask questions about your documents and keep notes. Only you can access
          your notebooks.
        </p>
      </header>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || create.isPending || !userId) return;
          create.mutate();
        }}
      >
        <Input
          className="max-w-md"
          aria-label="New notebook name"
          placeholder="Notebook name..."
          value={title}
          disabled={create.isPending}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button
          loading={create.isPending}
          disabled={!title.trim() || create.isPending || !userId}
        >
          <Plus />
          {create.isPending ? "Creating..." : "Create notebook"}
        </Button>
      </form>
      {(query.isError || create.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Unable to load your notebooks. Try again.
          <Button variant="link" onClick={() => query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {query.isPending && <LoadingState label="Loading notebooks..." />}
      {!query.isError && query.data?.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-muted-foreground">
          No notebooks yet. Create one to add your documents.
        </p>
      )}
      {!query.isError && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data?.map((notebook) => (
            <Link
              href={`/ai/notebooks/${notebook.id}`}
              key={notebook.id}
              className="group rounded-xl border bg-background p-5 transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BookOpen className="mb-4 size-5 text-link" aria-hidden="true" />
              <h2 className="break-words font-semibold">{notebook.title}</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(notebook.updated_at).toLocaleDateString("en-US")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

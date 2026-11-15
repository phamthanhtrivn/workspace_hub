"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { store, useAppSelector } from "@/store/store";
import { useDebouncedValue } from "@/features/chat/hooks/useDebouncedValue";
import { getActionErrorMessage } from "@/lib/permission-feedback";
import {
  fileCopyApi,
  filePickerKey,
  type PickerDocument,
  type PickerScope,
} from "../api/file-copy.api";
import { fileCopyAttempt } from "../utils/file-copy-attempt";

export interface FilePickerProps {
  context: string;
  projectId?: string;
  initialScope?: Exclude<PickerScope, "project">;
  allowFolders?: boolean;
  disabled?: boolean;
  maxSelection?: number;
  isAdded?: (document: PickerDocument) => boolean;
  validate?: (documents: PickerDocument[]) => string;
  onConfirm: (
    documents: PickerDocument[],
    operationId: string,
    signal: AbortSignal,
    assertActor: () => void,
  ) => Promise<void>;
  onPending?: (pending: boolean) => void;
}
export function useFilePicker(props: FilePickerProps) {
  const actorId = useAppSelector((state) => state.auth.userId);
  const [scope, setScope] = useState<Exclude<PickerScope, "project">>(
    props.initialScope ?? "personal",
  );
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim(), 300);
  const [selection, setSelection] = useState<Map<string, PickerDocument>>(
    new Map(),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => active.current?.abort(),
    [props.context, props.projectId, actorId],
  );
  const selected = [...selection.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const contextKey = `${actorId}:${props.context}:${props.projectId ?? ""}`;
  const [account, setAccount] = useState(contextKey);
  if (account !== contextKey) {
    setAccount(contextKey);
    setSelection(new Map());
    setFolders([]);
    setPage(1);
    setSearch("");
    setError("");
    setScope(props.initialScope ?? "personal");
  }
  const locked = pending || props.disabled;
  const queryScope = props.projectId ? "project" : scope;
  const query = useQuery({
    queryKey: [
      ...filePickerKey(actorId),
      queryScope,
      props.projectId,
      folders.at(-1)?.id,
      page,
      term,
    ],
    queryFn: ({ signal }) =>
      fileCopyApi.list(
        {
          scope: queryScope,
          projectId: props.projectId,
          folderId: folders.at(-1)?.id,
          page,
          search: term,
        },
        signal,
      ),
    enabled: !!actorId && term === search.trim(),
    staleTime: 30000,
    gcTime: 300000,
    retry: false,
  });
  const navigate = (next: typeof folders) => {
    setFolders(next);
    setPage(1);
    setSearch("");
  };
  const reason = (document: PickerDocument, candidates = selected) => {
    if (props.isAdded?.(document)) return "Already added";
    const next = [
      ...candidates.filter((file) => file.id !== document.id),
      document,
    ];
    if (next.length > (props.maxSelection ?? 10))
      return `Select up to ${props.maxSelection ?? 10} files.`;

    return props.validate?.(next) || "";
  };
  const toggle = (document: PickerDocument) => {
    if (locked) return;
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(document.id)) next.delete(document.id);
      else if (!reason(document, [...current.values()]))
        next.set(document.id, document);

      return next;
    });
  };
  const confirm = async () => {
    if (active.current || locked || !selected.length || !actorId) return;
    const controller = new AbortController();
    let attempt: Awaited<ReturnType<typeof fileCopyAttempt>> | undefined;
    active.current = controller;
    setPending(true);
    props.onPending?.(true);
    setError("");
    const assertActor = () => {
      controller.signal.throwIfAborted();
      if (store.getState().auth.userId !== actorId)
        throw new Error("Your account changed. Reopen the file picker.");
    };
    try {
      assertActor();
      const invalid = props.validate?.(selected);
      if (invalid) throw new Error(invalid);
      attempt = await fileCopyAttempt(actorId, props.context, selected);
      assertActor();
      await props.onConfirm(
        selected,
        attempt.operationId,
        controller.signal,
        assertActor,
      );
      // Successful adapters may close/unmount their dialog. Cleanup aborts the
      // request signal, but must not retain an already confirmed copy attempt.
      if (store.getState().auth.userId !== actorId) return;
      attempt.complete();
      if (!controller.signal.aborted) setSelection(new Map());
    } catch (cause) {
      if (
        isAxiosError(cause) &&
        [410, 412].includes(cause.response?.status ?? 0)
      )
        attempt?.complete();
      if (isAxiosError(cause) && cause.response?.status === 412) {
        setSelection(new Map());
        void query.refetch();
      }
      if (!controller.signal.aborted)
        setError(
          getActionErrorMessage(
            cause,
            cause instanceof Error
              ? cause.message
              : "Unable to copy the selected files.",
          ),
        );
    } finally {
      active.current = null;
      setPending(false);
      props.onPending?.(false);
    }
  };

  return {
    actorId,
    scope: queryScope,
    setScope,
    folders,
    navigate,
    page,
    setPage,
    search,
    setSearch,
    query,
    selected,
    selection,
    toggle,
    reason,
    pending,
    locked,
    error,
    confirm,
    searching: term !== search.trim(),
  };
}

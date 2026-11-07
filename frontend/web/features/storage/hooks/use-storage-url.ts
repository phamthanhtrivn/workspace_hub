"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { getStorageAccess, isLegacyStorageUrl, isPrivateStorageReference } from "../api/storage.api";

export function useStorageUrl(source: string | undefined) {
  const userId = useAppSelector((state) => state.auth.userId);
  const hasToken = useAppSelector((state) => !!state.auth.accessToken);
  const reference = source ?? "";
  const privateReference = isPrivateStorageReference(reference);
  const query = useQuery({
    queryKey: ["storage-url", userId, reference],
    queryFn: ({ signal }) => getStorageAccess(reference, signal),
    enabled: privateReference && !!userId && hasToken,
    staleTime: 60_000,
    gcTime: 120_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const refreshedAt = useRef(0);
  useEffect(() => { refreshedAt.current = 0; }, [reference, userId]);
  const refresh = () => {
    if (!privateReference || Date.now() - refreshedAt.current < 60_000 || !hasToken || !userId) return false;
    refreshedAt.current = Date.now();
    void query.refetch();
    return true;
  };
  const url = privateReference ? (hasToken && userId ? query.data?.url : undefined)
    : isLegacyStorageUrl(reference) ? undefined : source;
  return {
    url, privateReference, refresh,
    isLoading: privateReference && Boolean(userId && hasToken) && query.isPending,
  };
}

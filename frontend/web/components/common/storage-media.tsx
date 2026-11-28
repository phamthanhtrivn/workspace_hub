"use client";

import { forwardRef, type AudioHTMLAttributes, type VideoHTMLAttributes, type AnchorHTMLAttributes, type ImgHTMLAttributes } from "react";
import { useStorageUrl } from "@/features/storage/hooks/use-storage-url";
import { isPrivateStorageReference, openStorageAsset } from "@/features/storage/api/storage.api";

export const StorageImg = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(
  function StorageImg({ src, alt = "", onError, ...props }, ref) {
    const access = useStorageUrl(typeof src === "string" ? src : undefined);
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} ref={ref} alt={alt} src={typeof src === "string" ? access.url || undefined : src}
      onError={(event) => { if (!access.refresh()) onError?.(event); }} />;
  },
);

export const StorageVideo = forwardRef<HTMLVideoElement, VideoHTMLAttributes<HTMLVideoElement>>(
  function StorageVideo({ src, onError, ...props }, ref) {
    const access = useStorageUrl(typeof src === "string" ? src : undefined);
    return <video {...props} ref={ref} src={typeof src === "string" ? access.url || undefined : src}
      onError={(event) => { if (!access.refresh()) onError?.(event); }} />;
  },
);

export const StorageAudio = forwardRef<HTMLAudioElement, AudioHTMLAttributes<HTMLAudioElement>>(
  function StorageAudio({ src, onError, ...props }, ref) {
    const access = useStorageUrl(typeof src === "string" ? src : undefined);
    return <audio {...props} ref={ref} src={typeof src === "string" ? access.url || undefined : src}
      onError={(event) => { if (!access.refresh()) onError?.(event); }} />;
  },
);

export function StorageLink({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const access = useStorageUrl(href);
  return <a {...props} href={access.url} onClick={(event) => {
    onClick?.(event);
    if (!event.defaultPrevented && href && isPrivateStorageReference(href)) {
      event.preventDefault();
      void openStorageAsset(href).catch(() => {});
    }
  }} />;
}

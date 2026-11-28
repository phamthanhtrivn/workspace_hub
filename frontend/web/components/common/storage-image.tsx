"use client";

import { forwardRef } from "react";
import NextImage, { type ImageProps } from "next/image";
export type { ImageProps } from "next/image";
import { useStorageUrl } from "@/features/storage/hooks/use-storage-url";

const EMPTY_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const StorageImage = forwardRef<HTMLImageElement, ImageProps>(function StorageImage(
  { src, onError, unoptimized, ...props }, ref,
) {
  const access = useStorageUrl(typeof src === "string" ? src : undefined);
  const resolved = typeof src === "string" ? access.url : src;
  return <NextImage {...props} ref={ref} src={resolved || EMPTY_IMAGE}
    unoptimized={unoptimized || access.privateReference || !resolved}
    onError={(event) => { if (!access.refresh()) onError?.(event); }} />;
});

export default StorageImage;

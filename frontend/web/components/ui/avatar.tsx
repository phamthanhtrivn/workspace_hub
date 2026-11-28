"use client";

import type { ComponentProps } from "react";
import { Avatar as Primitive } from "@base-ui/react/avatar";
import { cn } from "@/lib/utils";
import { useStorageUrl } from "@/features/storage/hooks/use-storage-url";

export function Avatar({ className, ...props }: Omit<ComponentProps<typeof Primitive.Root>, "className"> & { className?: string }) {
  return <Primitive.Root data-slot="avatar" className={cn("relative inline-flex size-8 shrink-0 overflow-hidden rounded-full", className)} {...props} />;
}
export function AvatarImage({ className, src, onLoadingStatusChange, ...props }: Omit<ComponentProps<typeof Primitive.Image>, "className"> & { className?: string }) {
  const access = useStorageUrl(typeof src === "string" ? src : undefined);
  return <Primitive.Image data-slot="avatar-image" className={cn("size-full object-cover", className)} {...props} src={typeof src === "string" ? access.url : src}
    onLoadingStatusChange={(status) => { if (status === "error") access.refresh(); onLoadingStatusChange?.(status); }} />;
}
export function AvatarFallback({ className, ...props }: Omit<ComponentProps<typeof Primitive.Fallback>, "className"> & { className?: string }) {
  return <Primitive.Fallback data-slot="avatar-fallback" className={cn("grid size-full place-items-center bg-secondary text-secondary-foreground", className)} {...props} />;
}

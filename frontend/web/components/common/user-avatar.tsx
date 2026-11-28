"use client";

import { useState, type CSSProperties } from "react";
import { UserRound } from "lucide-react";
import StorageImage from "./storage-image";
import { Spinner } from "@/components/ui/spinner";
import { useStorageUrl } from "@/features/storage/hooks/use-storage-url";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  alt?: string | null;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  className?: string;
  iconClassName?: string;
  style?: CSSProperties;
  title?: string;
}

function AvatarPhoto({ src, sizes, iconClassName, retry }: {
  src: string;
  sizes?: string;
  iconClassName?: string;
  retry: () => boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  if (status === "error") return <UserRound aria-hidden="true" className={iconClassName} />;

  return (
    <>
      {status === "loading" && <Spinner tone="inherit" />}
      <StorageImage
        src={src} alt="" fill sizes={sizes} unoptimized
        className={cn("object-cover", status !== "loaded" && "opacity-0")}
        onLoad={() => setStatus("loaded")}
        onError={() => { setStatus("error"); retry(); }}
      />
    </>
  );
}

/** User photos resolve private references before loading; only missing/failed photos use the icon. */
export function UserAvatar({
  src, alt, width, height, fill, sizes, className, iconClassName, style, title,
}: UserAvatarProps) {
  const source = src?.trim() || undefined;
  const access = useStorageUrl(source);
  const iconClasses = cn("h-1/2 w-1/2", iconClassName);

  return (
    <span
      role="img" aria-label={alt?.trim() || "User"} title={title}
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground align-middle",
        fill ? "absolute inset-0 size-full" : !width && !height && "size-full",
        className,
      )}
      style={{ width, height, ...style }}
    >
      {access.url ? (
        <AvatarPhoto key={`${source}:${access.url}`} src={access.url} sizes={sizes}
          iconClassName={iconClasses} retry={access.refresh} />
      ) : source && access.isLoading ? (
        <Spinner tone="inherit" />
      ) : <UserRound aria-hidden="true" className={iconClasses} />}
    </span>
  );
}

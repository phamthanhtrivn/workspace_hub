import Image from "next/image";
import { BRAND_ASSETS } from "@/lib/branding";
import { cn } from "@/lib/utils";

export function WorkspaceLogo({
  className,
  alt = "WorkspaceHub",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      src={BRAND_ASSETS.mark}
      alt={alt}
      width={128}
      height={128}
      unoptimized
      className={cn("shrink-0", className)}
    />
  );
}

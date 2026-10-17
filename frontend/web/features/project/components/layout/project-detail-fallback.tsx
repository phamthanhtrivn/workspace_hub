import Link from "next/link";
import { ArrowLeft, FolderSearch } from "lucide-react";

export function ProjectDetailLoading() {
  return (
    <div className="py-24 text-center text-sm font-semibold text-muted-foreground">
      Loading project...
    </div>
  );
}

export function ProjectDetailNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FolderSearch className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="mt-4 text-sm font-semibold text-muted-foreground">Project not found</p>
      <Link href="/projects" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-info hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to projects
      </Link>
    </div>
  );
}

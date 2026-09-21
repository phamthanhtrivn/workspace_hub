import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ProjectDetailLoading() {
  return (
    <div className="py-24 text-center text-sm font-semibold text-slate-400">
      Loading project...
    </div>
  );
}

export function ProjectDetailNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-2xl">📭</div>
      <p className="mt-4 text-sm font-bold text-slate-600">Project not found</p>
      <Link href="/projects" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#0052CC] hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to projects
      </Link>
    </div>
  );
}

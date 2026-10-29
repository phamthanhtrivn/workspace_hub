"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/store";
const Panel = dynamic(() => import("./work-assistant-panel"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="fixed bottom-24 right-4 z-50 rounded-xl border bg-background p-5 shadow-lg"
    >
      Đang mở trợ lý…
    </div>
  ),
});
export default function WorkAssistantLauncher() {
  const pathname = usePathname(),
    userId = useAppSelector((state) => state.auth.userId);
  const [open, setOpen] = useState(false);
  const eligible = ["/dashboard", "/projects", "/calendar"].some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
  if (!eligible || !userId) return null;
  const projectId = /^\/projects\/([0-9a-f-]{36})(?:\/|$)/i.exec(pathname)?.[1];
  return (
    <>
      {open && (
        <Panel
          key={userId}
          userId={userId}
          currentProjectId={projectId}
          onClose={() => setOpen(false)}
        />
      )}
      <Button
        type="button"
        size="lg"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Đóng trợ lý công việc" : "Mở trợ lý công việc"}
        aria-expanded={open}
        aria-controls={open ? "work-assistant-panel" : undefined}
        className="fixed bottom-5 right-5 z-50 h-12 gap-2 rounded-full px-4 shadow-lg"
      >
        <MessageSquareText className="size-5" aria-hidden="true" />
        <span>Trợ lý AI</span>
      </Button>
    </>
  );
}

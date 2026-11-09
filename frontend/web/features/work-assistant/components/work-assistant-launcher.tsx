"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/store";
import { resolveWorkContext } from "../constants/work-assistant";
const Panel = dynamic(() => import("./work-assistant-panel"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="fixed bottom-24 right-4 z-50 rounded-xl border bg-background p-5 shadow-lg"
    >
      Opening AI Assistant...
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
  const context = resolveWorkContext(pathname);

  return (
    <>
      {open && (
        <Panel
          key={userId}
          userId={userId}
          projectId={context.projectId}
          audience={context.audience}
          contextLabel={context.label}
          onClose={() => setOpen(false)}
        />
      )}
      <Button
        type="button"
        size="lg"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        aria-expanded={open}
        aria-controls={open ? "work-assistant-panel" : undefined}
        className="fixed bottom-5 right-5 z-50 h-12 gap-2 rounded-full px-4 shadow-lg"
      >
        <Bot className="size-5" aria-hidden="true" />
        <span>AI Assistant</span>
      </Button>
    </>
  );
}

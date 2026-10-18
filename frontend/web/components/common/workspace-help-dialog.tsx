"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CALENDAR_SHORTCUTS = [
  ["C", "Create an event"], ["T", "Go to today"], ["D / W / M", "Day / week / month view"],
  ["A / Y", "Week agenda / year list"],
];

export function WorkspaceHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] flex-col">
      <DialogHeader><DialogTitle>Help & shortcuts</DialogTitle><DialogDescription>Keep related work connected without losing its context.</DialogDescription></DialogHeader>
      <div className="min-h-0 space-y-5 overflow-y-auto px-5 pb-5">
        <section className="space-y-2"><h3 className="font-semibold">Find your next action</h3><p className="text-sm text-muted-foreground">Dashboard brings together today’s tasks and meetings. Use Calendar for personal commitments, Projects for team tasks, and Pomodoro to focus on an eligible task.</p>
          <div className="flex flex-wrap gap-2">{[["/dashboard", "Dashboard"], ["/calendar", "Calendar"], ["/projects", "Projects"], ["/pomodoro", "Pomodoro"]].map(([href, label]) => <Button key={href} asChild variant="outline" size="sm"><Link href={href} onClick={onClose}>{label}</Link></Button>)}</div>
        </section>
        <section className="space-y-2"><h3 className="font-semibold">Keyboard basics</h3><p className="text-sm text-muted-foreground">Tab and Shift+Tab move between controls. Enter or Space activates buttons. Escape closes the current menu or dismissible dialog. A dialog with unsaved changes may ask you to save or discard them.</p></section>
        {pathname.startsWith("/calendar") && <section className="space-y-2"><h3 className="font-semibold">Calendar shortcuts</h3><p className="text-xs text-muted-foreground">Available while you are on the calendar, outside text fields and dialogs.</p><dl className="space-y-2">{CALENDAR_SHORTCUTS.map(([key, action]) => <div key={key} className="flex flex-wrap justify-between gap-2 text-sm"><dt><kbd className="rounded border border-input bg-muted px-2 py-1">{key}</kbd></dt><dd>{action}</dd></div>)}</dl></section>}
        {(pathname.startsWith("/documents") || pathname.startsWith("/projects/")) && <section className="space-y-2"><h3 className="font-semibold">Document search</h3><p className="text-sm text-muted-foreground">Ctrl+K on Windows, or Command+K on macOS, focuses the visible document search. This shortcut does not interrupt typing or an open dialog.</p></section>}
        <section className="space-y-2"><h3 className="font-semibold">Missing information?</h3><p className="text-sm text-muted-foreground">Use Retry when loading fails. Empty lists describe loaded results; they do not mean access was removed. Available actions depend on your role. AI Assistant is coming soon.</p></section>
      </div>
    </DialogContent>
  </Dialog>;
}

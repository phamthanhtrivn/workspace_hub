"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getHelpTopicLabel } from "../constants/help-topics";
import { useWorkspaceHelp } from "../hooks/use-workspace-help";
import type { HelpShortcut } from "../types";

const subscribePlatform = () => () => {};
const getMacPlatform = () => /Mac|iPhone|iPad/.test(navigator.platform);
const serverPlatform = () => false;

export function ShortcutKeys({
  keys,
  sequential = false,
}: {
  keys: readonly string[];
  sequential?: boolean;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-xs"
      aria-label={keys.join(sequential ? " then " : " plus ")}
    >
      {keys.map((key, index) => (
        <span
          key={`${key}-${index}`}
          className="inline-flex items-center gap-1"
        >
          {index > 0 && (
            <span aria-hidden="true" className="text-muted-foreground">
              {sequential ? "then" : "+"}
            </span>
          )}
          <kbd className="inline-flex min-h-6 min-w-6 items-center justify-center rounded border border-input bg-background px-1.5 font-sans text-xs font-medium text-foreground shadow-sm">
            {key}
          </kbd>
        </span>
      ))}
    </span>
  );
}

export function HelpShortcutsPanel({
  shortcuts,
}: {
  shortcuts: readonly HelpShortcut[];
}) {
  const { shortcutsEnabled, setShortcutsEnabled } = useWorkspaceHelp();
  const detectedMac = useSyncExternalStore(
    subscribePlatform,
    getMacPlatform,
    serverPlatform,
  );
  const [platform, setPlatform] = useState<"windows" | "mac" | null>(null);
  const isMac = platform ? platform === "mac" : detectedMac;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-control bg-muted/60 p-4">
        <div>
          <label
            htmlFor="help-app-shortcuts"
            className="cursor-pointer text-sm font-semibold"
          >
            App shortcuts
          </label>
          <p
            id="help-shortcut-preference"
            className="mt-1 text-xs leading-5 text-muted-foreground"
          >
            Saved in this browser. Help, standard navigation and editor
            shortcuts stay available.
          </p>
        </div>
        <Switch
          id="help-app-shortcuts"
          checked={shortcutsEnabled}
          onCheckedChange={setShortcutsEnabled}
          aria-describedby="help-shortcut-preference"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">
          App shortcuts pause in text fields and open menus or dialogs.
          Navigation keys are pressed in sequence.
        </p>
        <div
          role="group"
          aria-label="Shortcut operating system"
          className="flex gap-1 rounded-control bg-muted p-1"
        >
          <Button
            size="sm"
            variant={!isMac ? "secondary" : "ghost"}
            aria-pressed={!isMac}
            onClick={() => setPlatform("windows")}
            className="h-8 text-xs"
          >
            Windows / Linux
          </Button>
          <Button
            size="sm"
            variant={isMac ? "secondary" : "ghost"}
            aria-pressed={isMac}
            onClick={() => setPlatform("mac")}
            className="h-8 text-xs"
          >
            macOS
          </Button>
        </div>
      </div>
      <dl className="divide-y divide-border border-y border-border">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
          >
            <dt className="min-w-0 flex-1 basis-48">
              <span className="text-sm font-medium">{shortcut.action}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                {getHelpTopicLabel(shortcut.topic)}
                {!shortcutsEnabled && !shortcut.alwaysEnabled ? " · Off" : ""}
                {shortcut.note ? ` · ${shortcut.note}` : ""}
              </span>
            </dt>
            <dd>
              <ShortcutKeys
                keys={
                  isMac ? (shortcut.macKeys ?? shortcut.keys) : shortcut.keys
                }
                sequential={shortcut.id.startsWith("go-")}
              />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

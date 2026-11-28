"use client";

import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, CircleHelp, Keyboard, SearchX, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpArticleList } from "@/features/help/components/help-article-list";
import { HelpTopicNavigation } from "@/features/help/components/help-topic-navigation";
import { HelpSearchResults } from "@/features/help/components/help-search-results";
import {
  HelpShortcutsPanel,
  ShortcutKeys,
} from "@/features/help/components/help-shortcuts-panel";
import { HELP_GUIDES } from "@/features/help/constants/help-guides";
import { HELP_TROUBLESHOOTING } from "@/features/help/constants/help-troubleshooting";
import { HELP_SHORTCUTS } from "@/features/help/constants/help-shortcuts";
import {
  getHelpTopic,
  getHelpTopicLabel,
} from "@/features/help/constants/help-topics";
import { findHelpEntries } from "@/features/help/utils/help-search";
import { useOpenUserSettings } from "@/features/user-setting/hooks/use-open-user-settings";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";
import type { HelpTopic } from "@/features/help/types";
import { cn } from "@/lib/utils";

const HELP_TABS = [
  { id: "guides", label: "Guides", icon: BookOpen },
  { id: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard },
  { id: "troubleshooting", label: "Troubleshooting", icon: Wrench },
] as const;

export function WorkspaceHelpDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const currentTopic = getHelpTopic(usePathname());
  const descriptionId = useId();
  const openSettings = useOpenUserSettings();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<HelpTopic | "all">("all");
  const [tab, setTab] = useState("guides");
  const searching = query.trim().length > 0;
  const guides = findHelpEntries(HELP_GUIDES, query, topic, currentTopic);
  const shortcuts = findHelpEntries(HELP_SHORTCUTS, query, topic, currentTopic);
  const problems = findHelpEntries(
    HELP_TROUBLESHOOTING,
    query,
    topic,
    currentTopic,
  );
  const total = guides.length + shortcuts.length + problems.length;
  const visibleCount = searching
    ? total
    : tab === "guides"
      ? guides.length
      : tab === "shortcuts"
        ? shortcuts.length
        : problems.length;
  const handleOpenSettings = () => {
    onClose();
    openSettings?.(UserSettingTab.GENERAL);
  };
  const articlesProps = {
    onNavigate: onClose,
    onOpenSettings: handleOpenSettings,
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent
        aria-describedby={descriptionId}
        className="flex h-[min(760px,92dvh)] max-w-5xl flex-col"
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 pb-5 pr-14 sm:px-6 sm:pr-14">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CircleHelp aria-hidden="true" className="size-5 text-link" />
            Help & shortcuts
          </DialogTitle>
          <DialogDescription id={descriptionId}>
            Learn your workspace. Find an answer. Get back to your work.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <HelpTopicNavigation
            topic={topic}
            currentTopic={currentTopic}
            onTopicChange={setTopic}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 px-5 pt-5 sm:px-6">
              <SearchInput
                data-modal-initial-focus
                aria-label="Search help, shortcuts and troubleshooting"
                placeholder="Search help, shortcuts and troubleshooting…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onClear={() => setQuery("")}
                className="h-11"
              />
              {currentTopic && topic === "all" && !searching && (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  On {getHelpTopicLabel(currentTopic)}?{" "}
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setTopic(currentTopic)}
                    className="h-auto min-h-0 p-0 text-xs font-medium"
                  >
                    Show help for this page
                  </Button>
                </p>
              )}
            </div>
            <Tabs
              value={tab}
              onValueChange={setTab}
              className="min-h-0 flex-1 gap-0"
            >
              {!searching && (
                <TabsList
                  aria-label="Help sections"
                  className="mx-5 mt-4 h-auto w-auto shrink-0 justify-start overflow-x-auto rounded-none border-b border-border bg-transparent p-0 sm:mx-6"
                >
                  {HELP_TABS.map(({ id, label, icon: Icon }) => (
                    <TabsTrigger
                      key={id}
                      value={id}
                      unstyled
                      className="flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 text-xs font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground sm:text-sm"
                    >
                      <Icon
                        aria-hidden="true"
                        className="hidden size-4 sm:block"
                      />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 sm:px-6">
                <p
                  role="status"
                  aria-live="polite"
                  className={cn(
                    "mb-4 text-xs text-muted-foreground",
                    !searching && "sr-only",
                  )}
                >
                  {searching
                    ? `${total} results for “${query.trim()}”`
                    : `${visibleCount} entries`}
                  {topic !== "all" ? ` in ${getHelpTopicLabel(topic)}` : ""}
                </p>
                {visibleCount === 0 && (
                  <div className="flex flex-col items-center px-4 py-10 text-center">
                    <SearchX
                      aria-hidden="true"
                      className="mb-4 size-8 text-muted-foreground"
                    />
                    <h3 className="text-base font-semibold">
                      No matching help
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                      Try a task like “upload a file” or “AI summary”, or browse
                      all topics.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-5"
                      onClick={() => {
                        setQuery("");
                        setTopic("all");
                      }}
                    >
                      Reset search and filters
                    </Button>
                  </div>
                )}
                {searching ? (
                  <HelpSearchResults
                    guides={guides}
                    shortcuts={shortcuts}
                    problems={problems}
                    {...articlesProps}
                  />
                ) : (
                  <>
                    <TabsContent value="guides">
                      <h3 className="mb-1 text-base font-semibold">
                        {topic === "all"
                          ? "What would you like to do?"
                          : getHelpTopicLabel(topic)}
                      </h3>
                      <p className="mb-5 text-sm leading-6 text-muted-foreground">
                        Short guides for everyday work
                        {currentTopic && topic === "all"
                          ? ", with your current page first"
                          : ""}
                        .
                      </p>
                      <HelpArticleList articles={guides} {...articlesProps} />
                    </TabsContent>
                    <TabsContent value="shortcuts">
                      <HelpShortcutsPanel shortcuts={shortcuts} />
                    </TabsContent>
                    <TabsContent value="troubleshooting">
                      <h3 className="mb-1 text-base font-semibold">
                        Get back on track
                      </h3>
                      <p className="mb-5 text-sm leading-6 text-muted-foreground">
                        Check the cause and follow the next steps.
                      </p>
                      <HelpArticleList articles={problems} {...articlesProps} />
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </div>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/25 px-5 py-3 text-xs text-muted-foreground sm:px-6">
          <span>Help follows the features available in WorkspaceHub.</span>
          <span className="inline-flex items-center gap-2">
            <ShortcutKeys keys={["?"]} />
            Open help<span aria-hidden="true">·</span>
            <ShortcutKeys keys={["Esc"]} />
            Close
          </span>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

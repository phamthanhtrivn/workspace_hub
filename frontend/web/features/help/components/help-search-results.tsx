import { HelpArticleList } from "./help-article-list";
import { HelpShortcutsPanel } from "./help-shortcuts-panel";
import type { HelpArticle, HelpShortcut } from "../types";

export function HelpSearchResults({
  guides,
  shortcuts,
  problems,
  onNavigate,
  onOpenSettings,
}: {
  guides: readonly HelpArticle[];
  shortcuts: readonly HelpShortcut[];
  problems: readonly HelpArticle[];
  onNavigate: () => void;
  onOpenSettings: () => void;
}) {
  const articlesProps = { onNavigate, onOpenSettings };

  return (
    <div className="space-y-7">
      {guides.length > 0 && (
        <section aria-label="Matching guides">
          <h3 className="mb-3 text-sm font-semibold">
            Guides{" "}
            <span className="font-normal text-muted-foreground">
              ({guides.length})
            </span>
          </h3>
          <HelpArticleList articles={guides} {...articlesProps} />
        </section>
      )}
      {shortcuts.length > 0 && (
        <section aria-label="Matching keyboard shortcuts">
          <h3 className="mb-3 text-sm font-semibold">
            Keyboard shortcuts{" "}
            <span className="font-normal text-muted-foreground">
              ({shortcuts.length})
            </span>
          </h3>
          <HelpShortcutsPanel shortcuts={shortcuts} />
        </section>
      )}
      {problems.length > 0 && (
        <section aria-label="Matching troubleshooting">
          <h3 className="mb-3 text-sm font-semibold">
            Troubleshooting{" "}
            <span className="font-normal text-muted-foreground">
              ({problems.length})
            </span>
          </h3>
          <HelpArticleList articles={problems} {...articlesProps} />
        </section>
      )}
    </div>
  );
}

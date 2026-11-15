import Link from "next/link";
import { ArrowUpRight, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HELP_TOPICS, getHelpTopicLabel } from "../constants/help-topics";
import type { HelpArticle } from "../types";

export function HelpArticleList({
  articles,
  onNavigate,
  onOpenSettings,
}: {
  articles: readonly HelpArticle[];
  onNavigate: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {articles.map((article) => {
        const topic = HELP_TOPICS.find((entry) => entry.id === article.topic)!;
        const Icon = topic.icon;

        return (
          <Collapsible key={article.id} className="group">
            <CollapsibleTrigger className="flex w-full cursor-pointer items-start gap-3 rounded-control py-4 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
              <Icon
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-muted-foreground"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-6">
                  {article.title}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {article.description}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-data-[open]:rotate-180 motion-reduce:transition-none"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pb-5 pl-7 pr-1 sm:pr-7">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                {getHelpTopicLabel(article.topic)}
              </p>
              <ol className="ml-4 list-decimal space-y-2 text-sm leading-6 marker:text-muted-foreground">
                {article.steps.map((step) => (
                  <li key={step} className="pl-1">
                    {step}
                  </li>
                ))}
              </ol>
              {article.note && (
                <p className="mt-4 flex items-start gap-2 rounded-control bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
                  <Info
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0"
                  />
                  <span>{article.note}</span>
                </p>
              )}
              {"href" in topic ? (
                <Button
                  asChild
                  variant="link"
                  size="sm"
                  className="mt-3 h-auto px-0"
                >
                  <Link href={topic.href} onClick={onNavigate}>
                    Open {topic.label}
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-3 h-auto px-0"
                  onClick={onOpenSettings}
                >
                  Open Settings
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

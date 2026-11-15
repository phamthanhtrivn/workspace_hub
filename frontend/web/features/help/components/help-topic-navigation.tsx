import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HELP_TOPICS } from "../constants/help-topics";
import type { HelpTopic } from "../types";

export function HelpTopicNavigation({
  topic,
  currentTopic,
  onTopicChange,
}: {
  topic: HelpTopic | "all";
  currentTopic?: HelpTopic;
  onTopicChange: (topic: HelpTopic | "all") => void;
}) {
  return (
    <nav
      aria-label="Help topics"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-muted/25 p-3 md:w-52 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r"
    >
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={topic === "all"}
        onClick={() => onTopicChange("all")}
        className={cn(
          "shrink-0 justify-start gap-2",
          topic === "all" && "bg-primary-soft text-primary-soft-foreground",
        )}
      >
        <BookOpen aria-hidden="true" className="size-4" />
        All topics
      </Button>
      {HELP_TOPICS.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant="ghost"
          size="sm"
          aria-pressed={topic === id}
          aria-label={id === currentTopic ? `${label}, current page` : label}
          onClick={() => onTopicChange(id)}
          className={cn(
            "shrink-0 justify-start gap-2",
            topic === id && "bg-primary-soft text-primary-soft-foreground",
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
          {id === currentTopic && (
            <span
              aria-hidden="true"
              className="ml-auto size-1.5 rounded-full bg-link"
            />
          )}
        </Button>
      ))}
    </nav>
  );
}

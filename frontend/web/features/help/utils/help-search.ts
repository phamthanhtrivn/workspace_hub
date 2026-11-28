import type { HelpArticle, HelpShortcut, HelpTopic } from "../types";
import { getHelpTopicLabel } from "../constants/help-topics";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesHelpSearch(
  entry: HelpArticle | HelpShortcut,
  query: string,
) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const content =
    "title" in entry
      ? [
          entry.title,
          entry.description,
          ...entry.steps,
          entry.note,
          entry.keywords,
        ]
      : [entry.action, ...entry.keys, ...(entry.macKeys ?? []), entry.note];
  const haystack = normalize(
    [getHelpTopicLabel(entry.topic), ...content].join(" "),
  );

  return words.every((word) => haystack.includes(word));
}

export function findHelpEntries<T extends HelpArticle | HelpShortcut>(
  entries: readonly T[],
  query: string,
  topic: HelpTopic | "all",
  currentTopic?: HelpTopic,
) {
  return entries
    .filter(
      (entry) =>
        (topic === "all" ||
          entry.topic === topic ||
          entry.relatedTopics?.includes(topic) ||
          entry.topic === "global") &&
        matchesHelpSearch(entry, query),
    )
    .sort(
      (left, right) =>
        Number(right.topic === currentTopic) -
        Number(left.topic === currentTopic),
    );
}

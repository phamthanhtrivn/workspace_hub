import type { Parent, Root, RootContent } from "mdast";
import type { TaskReference } from "../types";
import { taskHref } from "./task-reference";

function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Link known task names in prose without rewriting Markdown or trusting model URLs. */
export function remarkTaskLinks({ sources }: { sources: TaskReference[] }) {
  const destinations = new Map<string, Set<string>>();
  for (const source of sources) {
    const title = normalizeTitle(source.title);
    if (!title) continue;
    const urls = destinations.get(title) ?? new Set<string>();
    urls.add(taskHref(source));
    destinations.set(title, urls);
  }
  if (!destinations.size) return;

  const titles = [...destinations.keys()]
    .sort((first, second) => second.length - first.length)
    .map((title) =>
      title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
    );
  const mentions = new RegExp(
    `(?<![\\p{L}\\p{N}_])(?:${titles.join("|")})(?![\\p{L}\\p{N}_])`,
    "giu",
  );

  function linkText(value: string): RootContent[] {
    const children: RootContent[] = [];
    let offset = 0;
    for (const match of value.matchAll(mentions)) {
      const title = match[0];
      const urls = destinations.get(normalizeTitle(title));
      // Identical task names can refer to different projects or calendar tasks.
      if (!urls || urls.size !== 1) continue;
      if (match.index > offset)
        children.push({
          type: "text",
          value: value.slice(offset, match.index),
        });
      children.push({
        type: "link",
        url: [...urls][0],
        children: [{ type: "text", value: title }],
      });
      offset = match.index + title.length;
    }
    if (offset < value.length)
      children.push({ type: "text", value: value.slice(offset) });

    return children;
  }

  function visit(parent: Parent) {
    parent.children = parent.children.flatMap((child): RootContent[] => {
      if (child.type === "text") return linkText(child.value);
      if (
        child.type !== "link" &&
        child.type !== "linkReference" &&
        "children" in child
      )
        visit(child);

      return [child];
    });
  }

  return (tree: Root) => visit(tree);
}

"use client";

import { useEffect } from "react";
import { useUrlQuery } from "@/hooks/use-url-query";
import {
  canonicalizeProjectQuery,
  parseProjectView,
  projectViewQuery,
  type ProjectViewMode,
} from "../utils/project-navigation";

export function useProjectLocation() {
  const { params, updateQuery } = useUrlQuery();
  const query = params.toString();
  const view = parseProjectView(new URLSearchParams(query));
  useEffect(() => {
    if (
      canonicalizeProjectQuery(new URLSearchParams(query)).toString() !== query
    )
      updateQuery(canonicalizeProjectQuery);
  }, [query, updateQuery]);

  return {
    view,
    changeView: (nextView: ProjectViewMode) =>
      updateQuery((current) => projectViewQuery(current, nextView), "push"),
  };
}

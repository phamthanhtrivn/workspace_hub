"use client";

import { useUrlQuery } from "@/hooks/use-url-query";
import {
  parseProjectMemberFilters,
  PROJECT_DETAIL_QUERY,
  type ProjectMemberRoleFilter,
} from "../utils/project-navigation";

export function useProjectMemberFilters() {
  const { params, updateQuery } = useUrlQuery();
  const filters = parseProjectMemberFilters(
    new URLSearchParams(params.toString()),
  );
  const setSearchQuery = (value: string) =>
    updateQuery((current) => {
      if (value) current.set(PROJECT_DETAIL_QUERY.memberSearch, value);
      else current.delete(PROJECT_DETAIL_QUERY.memberSearch);

      return current;
    });
  const setRole = (role: ProjectMemberRoleFilter) =>
    updateQuery((current) => {
      if (role === "ALL") current.delete(PROJECT_DETAIL_QUERY.memberRole);
      else current.set(PROJECT_DETAIL_QUERY.memberRole, role.toLowerCase());

      return current;
    }, "push");

  return { ...filters, setSearchQuery, setRole };
}

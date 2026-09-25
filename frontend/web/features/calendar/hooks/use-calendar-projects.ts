import { useQuery } from "@tanstack/react-query";
import { getProjects } from "@/features/project/api/project.api";
import { fetchAllPages } from "@/features/project/api/pagination";
import { projectKeys } from "@/features/project/hooks/use-projects";

const PROJECT_PAGE_SIZE = 10;

export async function getCalendarProjects() {
  return fetchAllPages(async (page) => {
    const result = await getProjects({ page, limit: PROJECT_PAGE_SIZE });
    return { items: result.data, meta: result.meta };
  }, PROJECT_PAGE_SIZE);
}

export function useCalendarProjects() {
  return useQuery({
    queryKey: [...projectKeys.all, "calendar-list"],
    queryFn: getCalendarProjects,
    staleTime: 60_000,
  });
}

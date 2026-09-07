export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

interface PageResult<T> {
  items: T[];
  meta?: PaginationMeta | null;
}

const DEFAULT_PAGE_SIZE = 100;

export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<PageResult<T>>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const result = await fetchPage(page, pageSize);
    items.push(...result.items);

    if (!result.meta?.hasNext) return items;

    const nextPage = result.meta.page + 1;
    if (nextPage <= page) {
      throw new Error("Invalid pagination metadata: next page did not advance");
    }
    page = nextPage;
  }
}

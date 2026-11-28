export type PaginationPageNumber = number | "ellipsis-start" | "ellipsis-end";

export function getPaginationPageNumbers(
  currentPage: number,
  totalPages: number,
): PaginationPageNumber[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const firstNearbyPage = Math.max(2, safeCurrentPage - 2);
  const lastNearbyPage = Math.min(totalPages - 1, safeCurrentPage + 2);
  const pages: PaginationPageNumber[] = [];

  pages.push(1);

  if (firstNearbyPage > 2) {
    pages.push("ellipsis-start");
  }

  for (let page = firstNearbyPage; page <= lastNearbyPage; page += 1) {
    pages.push(page);
  }

  if (lastNearbyPage < totalPages - 1) {
    pages.push("ellipsis-end");
  }

  pages.push(totalPages);

  return pages;
}

export function getPomodoroPagination(totalCount: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  return { currentPage, totalPages, startIndex, endIndex };
}

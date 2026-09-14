export function getDocumentsPageNumbers(
  currentPage: number,
  totalPages: number
): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "...",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}
